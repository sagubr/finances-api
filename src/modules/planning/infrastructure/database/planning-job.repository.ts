import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  BudgetConsumption,
  IPlanningJobRepository,
  ScheduledRecurringRule,
} from "#/modules/planning/application/ports/planning-job.repository.js";
import {
  budgets,
  budgetThresholdDeliveries,
  cardStatements,
  creditCards,
  importBatches,
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
import {
  categorizedConsumptionTypes,
  transactionSource,
} from "#/modules/transactions/public/transaction-source.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { and, eq, gte, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { CardStatementProjectionWriter } from "./card-statement-projection.writer.js";
import { materializeOpenCardStatement } from "./open-card-statement.js";

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

  listExpiredImportFiles(before: Date, limit: number) {
    return this.database
      .select({ id: importBatches.id, storageKey: importBatches.storageKey })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.workspaceId, this.workspaceId),
          lt(importBatches.expiresAt, before),
          ne(importBatches.storageKey, ""),
        ),
      )
      .orderBy(importBatches.expiresAt)
      .limit(limit);
  }

  async markImportFileRemoved(id: bigint): Promise<void> {
    await this.database
      .update(importBatches)
      .set({ storageKey: "", updatedAt: new Date() })
      .where(and(eq(importBatches.workspaceId, this.workspaceId), eq(importBatches.id, id)));
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
          .for("update", { of: recurringRules })
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
            .for("share")
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
        sourceModule: card ? transactionSource.cardRecurring : transactionSource.recurring,
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

    const statement = await materializeOpenCardStatement(this.database, {
      workspaceId: this.workspaceId,
      card,
      occurredOn: logicalDate,
      generateId: this.generateId,
    });
    await this.database.insert(statementCycles).values({
      workspaceId: this.workspaceId,
      statementId: statement.id,
      transactionId,
    });
    const updatedStatement = (
      await this.database
        .update(cardStatements)
        .set({
          totalCents: sql`${cardStatements.totalCents} + ${rule.amountCents}`,
          updatedAt: new Date(),
        })
        .where(eq(cardStatements.id, statement.id))
        .returning({ totalCents: cardStatements.totalCents })
    )[0];
    if (!updatedStatement) throw new Error("Recurring card statement total was not updated.");
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
      totalCents: updatedStatement.totalCents,
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

  async closeDueStatements(referenceOn: string) {
    const closed = await this.database
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
        id: cardStatements.id,
        publicId: cardStatements.publicId,
        totalCents: cardStatements.totalCents,
        version: cardStatements.version,
      });
    if (closed.length > 0)
      await this.database
        .update(transactions)
        .set({
          status: "CONFIRMED",
          version: sql`${transactions.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.workspaceId, this.workspaceId),
            eq(transactions.status, "PLANNED"),
            isNull(transactions.deletedAt),
            sql`exists (
              select 1
              from ${statementCycles}
              where ${statementCycles.transactionId} = ${transactions.id}
                and ${statementCycles.statementId} in (${sql.join(
                  closed.map(({ id }) => sql`${id}`),
                  sql`, `,
                )})
            )`,
          ),
        );
    return closed.map(({ publicId, totalCents, version }) => ({
      publicId,
      totalCents,
      version,
    }));
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
            inArray(transactions.type, categorizedConsumptionTypes),
            eq(transactions.currency, budget.currency),
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
