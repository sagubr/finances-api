import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  BudgetConsumption,
  IPlanningJobRepository,
  ScheduledRecurringRule,
} from "#/modules/planning/application/ports/planning-job.repository.js";
import { resolveCardCycle } from "#/modules/planning/domain/card-cycle.js";
import {
  budgets,
  budgetThresholdDeliveries,
  cardStatements,
  creditCards,
  recurringOccurrences,
  recurringRules,
  statementCycles,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import { outboxEvents } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { CardStatementProjectionWriter } from "./card-statement-projection.writer.js";

export class PlanningJobRepository implements IPlanningJobRepository {
  private readonly projection: CardStatementProjectionWriter;

  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
    private readonly generateId: () => string,
  ) {
    this.projection = new CardStatementProjectionWriter(database, { workspaceId }, this.generateId);
  }

  async listActiveRuleIds(referenceOn: string): Promise<readonly string[]> {
    const rows = await this.database
      .select({ id: recurringRules.publicId })
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.workspaceId, this.workspaceId),
          isNull(recurringRules.deletedAt),
          isNull(recurringRules.pausedAt),
          or(isNull(recurringRules.endsOn), gte(recurringRules.endsOn, referenceOn)),
        ),
      );
    return rows.map((row) => row.id);
  }

  async findRule(publicId: string): Promise<ScheduledRecurringRule | null> {
    return (
      (
        await this.database
          .select({
            id: recurringRules.id,
            publicId: recurringRules.publicId,
            accountId: recurringRules.accountId,
            creditCardId: recurringRules.creditCardId,
            categoryId: recurringRules.categoryId,
            type: recurringRules.type,
            description: recurringRules.description,
            amountCents: recurringRules.amountCents,
            currency: recurringRules.currency,
            frequency: recurringRules.frequency,
            interval: recurringRules.interval,
            dayOfMonth: recurringRules.dayOfMonth,
            endsOn: recurringRules.endsOn,
            nextOccurrenceOn: recurringRules.nextOccurrenceOn,
          })
          .from(recurringRules)
          .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
          .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
          .where(
            and(
              eq(recurringRules.workspaceId, this.workspaceId),
              eq(recurringRules.publicId, publicId),
              isNull(recurringRules.deletedAt),
              isNull(recurringRules.pausedAt),
              eq(accounts.active, true),
              isNull(accounts.deletedAt),
              or(isNull(recurringRules.categoryId), eq(categories.active, true)),
            ),
          )
          .limit(1)
          .for("update")
      )[0] ?? null
    );
  }

  async createOccurrence(publicId: string, ruleId: bigint, logicalDate: string) {
    const rows = await this.database
      .insert(recurringOccurrences)
      .values({ publicId, workspaceId: this.workspaceId, ruleId, logicalDate })
      .onConflictDoNothing({
        target: [recurringOccurrences.ruleId, recurringOccurrences.logicalDate],
      })
      .returning({ id: recurringOccurrences.id });
    return rows[0]?.id ?? null;
  }

  async createPlannedTransaction(
    publicId: string,
    rule: ScheduledRecurringRule,
    logicalDate: string,
  ) {
    const card = rule.creditCardId
      ? (
          await this.database
            .select()
            .from(creditCards)
            .where(
              and(
                eq(creditCards.workspaceId, this.workspaceId),
                eq(creditCards.id, rule.creditCardId),
                eq(creditCards.active, true),
              ),
            )
            .limit(1)
        )[0]
      : undefined;
    if (rule.creditCardId && !card)
      throw new ApplicationError("O cartão da recorrência não está disponível.", {
        category: "conflict",
        code: "RECURRENCE_CARD_UNAVAILABLE",
      });
    const rows = await this.database
      .insert(transactions)
      .values({
        publicId,
        workspaceId: this.workspaceId,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        type: card?.accountingMode === "PAYMENT_ONLY" ? "CARD_PAYMENT" : rule.type,
        status: "PLANNED",
        amountCents: rule.amountCents,
        currency: rule.currency,
        description: rule.description,
        occurredOn: logicalDate,
        competenceMonth: logicalDate.slice(0, 7),
        sourceModule: card ? "CCRC" : "RC",
        sourcePublicId: rule.publicId,
        sourceSequence: Number(logicalDate.replaceAll("-", "")),
      })
      .onConflictDoNothing({
        target: [
          transactions.workspaceId,
          transactions.sourceModule,
          transactions.sourcePublicId,
          transactions.sourceSequence,
        ],
        where: sql`${transactions.sourcePublicId} is not null`,
      })
      .returning({ id: transactions.id });
    const transactionId = rows[0]?.id ?? null;
    if (!transactionId || !card) return transactionId;

    const cycle = resolveCardCycle(logicalDate, card.closingDay, card.dueDay);
    const statement = (
      await this.database
        .insert(cardStatements)
        .values({
          publicId: this.generateId(),
          workspaceId: this.workspaceId,
          cardId: card.id,
          cycleStartOn: cycle.startsOn,
          cycleEndOn: cycle.endsOn,
          dueOn: cycle.dueOn,
          accountingMode: card.accountingMode,
        })
        .onConflictDoUpdate({
          target: [cardStatements.cardId, cardStatements.cycleStartOn],
          set: { updatedAt: sql`${cardStatements.updatedAt}` },
        })
        .returning()
    )[0];
    if (!statement) throw new Error("Recurring card statement was not materialized.");
    if (statement.status !== "OPEN")
      throw new ApplicationError("A fatura da recorrência já está fechada.", {
        category: "conflict",
        code: "RECURRENCE_STATEMENT_IMMUTABLE",
      });
    await this.database.insert(statementCycles).values({
      workspaceId: this.workspaceId,
      statementId: statement.id,
      transactionId,
    });
    const totalCents = statement.totalCents + rule.amountCents;
    await this.database
      .update(cardStatements)
      .set({ totalCents, updatedAt: new Date() })
      .where(eq(cardStatements.id, statement.id));
    if (!card.paymentAccountId)
      throw new ApplicationError("O cartão não possui conta de pagamento.", {
        category: "validation",
        code: "CARD_PAYMENT_ACCOUNT_REQUIRED",
      });
    await this.projection.sync({
      statementId: statement.publicId,
      accountId: card.paymentAccountId,
      cardName: card.name,
      currency: card.currency,
      dueOn: statement.dueOn,
      totalCents,
      paidCents: statement.paidCents,
    });
    return transactionId;
  }

  async linkOccurrence(occurrenceId: bigint, transactionId: bigint): Promise<void> {
    await this.database
      .update(recurringOccurrences)
      .set({ transactionId })
      .where(eq(recurringOccurrences.id, occurrenceId));
  }

  async advanceRule(ruleId: bigint, nextOccurrenceOn: string): Promise<void> {
    await this.database
      .update(recurringRules)
      .set({ nextOccurrenceOn, updatedAt: new Date() })
      .where(eq(recurringRules.id, ruleId));
  }

  closeDueStatements(referenceOn: string) {
    return this.database
      .update(cardStatements)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        version: sql`${cardStatements.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cardStatements.workspaceId, this.workspaceId),
          eq(cardStatements.status, "OPEN"),
          lte(cardStatements.cycleEndOn, referenceOn),
        ),
      )
      .returning({
        publicId: cardStatements.publicId,
        totalCents: cardStatements.totalCents,
        version: cardStatements.version,
      });
  }

  async listBudgetConsumption(month: string): Promise<readonly BudgetConsumption[]> {
    const rows = await this.database
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.workspaceId, this.workspaceId),
          eq(budgets.month, month),
          isNull(budgets.deletedAt),
        ),
      );
    const result: BudgetConsumption[] = [];
    for (const budget of rows) {
      const amounts = await this.database
        .select({ amount: transactions.amountCents })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, this.workspaceId),
            eq(transactions.competenceMonth, month),
            eq(transactions.type, "EXPENSE"),
            sql`${transactions.status} <> 'PLANNED'`,
            eq(transactions.categoryId, budget.categoryId),
            isNull(transactions.deletedAt),
          ),
        );
      result.push({
        id: budget.id,
        publicId: budget.publicId,
        version: budget.version,
        limitCents: budget.limitCents,
        realizedCents: amounts.reduce((sum, item) => sum + item.amount, 0n),
      });
    }
    return result;
  }

  async registerBudgetThreshold(budgetId: bigint, thresholdBps: number, budgetVersion: number) {
    const rows = await this.database
      .insert(budgetThresholdDeliveries)
      .values({
        workspaceId: this.workspaceId,
        budgetId,
        thresholdBps,
        budgetVersion,
      })
      .onConflictDoNothing({
        target: [
          budgetThresholdDeliveries.budgetId,
          budgetThresholdDeliveries.thresholdBps,
          budgetThresholdDeliveries.budgetVersion,
        ],
      })
      .returning({ id: budgetThresholdDeliveries.id });
    return Boolean(rows[0]);
  }

  async writeEvent(input: Parameters<IPlanningJobRepository["writeEvent"]>[0]) {
    await this.database.insert(outboxEvents).values({
      eventId: input.eventId,
      workspaceId: this.workspaceId,
      eventName: input.name,
      eventVersion: 1,
      aggregateType: input.aggregateType,
      aggregatePublicId: input.aggregateId,
      aggregateVersion: input.aggregateVersion,
      correlationId: input.correlationId,
      payload: input.payload,
      occurredAt: new Date(),
    });
  }
}
