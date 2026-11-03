import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IRecurringRepository } from "#/modules/planning/application/ports/recurring.repository.js";
import type { RecurringRuleView } from "#/modules/planning/dtos/planning.dto.js";
import {
  cardStatements,
  creditCards,
  recurringRules,
  statementCycles,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import {
  jobRuns,
  outboxEvents,
} from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import {
  cardRecurringSources,
  transactionSource,
} from "#/modules/transactions/public/transaction-source.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { CardStatementProjectionWriter } from "./card-statement-projection.writer.js";

type RecurringRow = typeof recurringRules.$inferSelect;
type JoinedRecurringRow = Readonly<{
  rule: RecurringRow;
  accountId: string;
  creditCardId: string | null;
  creditCardName: string | null;
  categoryId: string | null;
}>;

const safeMoney = (value: bigint): number => {
  const result = Number(value);
  if (!Number.isSafeInteger(result))
    throw new Error("Persisted monetary value exceeds safe range.");
  return result;
};
const mapRule = ({
  rule,
  accountId,
  creditCardId,
  creditCardName,
  categoryId,
}: JoinedRecurringRow): RecurringRuleView => ({
  id: rule.publicId,
  accountId,
  creditCardId,
  creditCardName,
  categoryId,
  type: rule.type,
  description: rule.description,
  amountCents: safeMoney(rule.amountCents),
  currency: rule.currency,
  frequency: rule.frequency,
  interval: rule.interval,
  dayOfMonth: rule.dayOfMonth,
  dayOfWeek: rule.dayOfWeek,
  startsOn: rule.startsOn,
  endsOn: rule.endsOn,
  nextOccurrenceOn: rule.nextOccurrenceOn,
  timezone: rule.timezone,
  pausedAt: rule.pausedAt?.toISOString() ?? null,
  version: rule.version,
});

export class RecurringRepository implements IRecurringRepository {
  private readonly projection: CardStatementProjectionWriter;

  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
    private readonly generateId: () => string,
  ) {
    this.projection = new CardStatementProjectionWriter(database, context, generateId);
  }

  async list(query: Parameters<IRecurringRepository["list"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        rule: recurringRules,
        accountId: accounts.publicId,
        creditCardId: creditCards.publicId,
        creditCardName: creditCards.name,
        categoryId: categories.publicId,
      })
      .from(recurringRules)
      .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
      .leftJoin(creditCards, eq(creditCards.id, recurringRules.creditCardId))
      .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
      .where(
        and(
          eq(recurringRules.workspaceId, this.context.workspaceId),
          isNull(recurringRules.deletedAt),
          ...(cursor ? [lt(recurringRules.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(recurringRules.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapRule), query.limit);
  }

  async create(
    publicId: string,
    input: Parameters<IRecurringRepository["create"]>[1],
  ): Promise<RecurringRuleView> {
    const accountRows = await this.database
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.workspaceId, this.context.workspaceId),
          eq(accounts.publicId, input.accountId),
          eq(accounts.currency, input.currency),
          eq(accounts.active, true),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);
    const categoryRows = input.categoryId
      ? await this.database
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.workspaceId, this.context.workspaceId),
              eq(categories.publicId, input.categoryId),
              eq(categories.type, input.type),
              eq(categories.active, true),
            ),
          )
          .limit(1)
          .for("share")
      : [];
    const account = accountRows[0];
    const category = categoryRows[0];
    if (!account || (input.categoryId && !category))
      throw new ApplicationError("Conta ou categoria incompatível.", {
        category: "validation",
        code: "RECURRENCE_RELATION_INVALID",
      });
    const cardRows = input.creditCardId
      ? await this.database
          .select({ id: creditCards.id, name: creditCards.name })
          .from(creditCards)
          .where(
            and(
              eq(creditCards.workspaceId, this.context.workspaceId),
              eq(creditCards.publicId, input.creditCardId),
              eq(creditCards.paymentAccountId, account.id),
              eq(creditCards.currency, input.currency),
              eq(creditCards.active, true),
            ),
          )
          .limit(1)
          .for("share")
      : [];
    const card = cardRows[0];
    if (input.creditCardId && (!card || !category))
      throw new ApplicationError("Cartão e conta de pagamento incompatíveis.", {
        category: "validation",
        code: "RECURRENCE_CARD_INVALID",
      });
    const rows = await this.database
      .insert(recurringRules)
      .values({
        publicId,
        workspaceId: this.context.workspaceId,
        accountId: account.id,
        creditCardId: card?.id,
        categoryId: category?.id,
        type: input.type,
        description: input.description,
        amountCents: BigInt(input.amountCents),
        currency: input.currency,
        frequency: input.frequency,
        interval: input.interval,
        dayOfMonth: input.dayOfMonth,
        dayOfWeek: input.dayOfWeek,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        nextOccurrenceOn: input.startsOn,
        timezone: input.timezone,
      })
      .returning();
    const rule = rows[0];
    if (!rule) throw new Error("Recurring rule insert did not return a row.");
    const mapped = mapRule({
      rule,
      accountId: input.accountId,
      creditCardId: input.creditCardId ?? null,
      creditCardName: card?.name ?? null,
      categoryId: input.categoryId ?? null,
    });
    await this.writeEvent("RecurringRuleCreated", publicId, 1, {
      id: publicId,
      frequency: input.frequency,
      interval: input.interval,
      version: 1,
    });
    await this.database
      .insert(jobRuns)
      .values({
        publicId: this.generateId(),
        workspaceId: this.context.workspaceId,
        jobName: "generate-occurrences",
        jobVersion: 1,
        executionKey: `generate-occurrences:${publicId}:${input.startsOn}`,
        payload: { ruleId: publicId, referenceOn: input.startsOn },
      })
      .onConflictDoNothing({ target: jobRuns.executionKey });
    return mapped;
  }

  async toggle(publicId: string, expectedVersion: number, paused: boolean) {
    const rows = await this.database
      .update(recurringRules)
      .set({
        pausedAt: paused ? new Date() : null,
        version: sql`${recurringRules.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringRules.workspaceId, this.context.workspaceId),
          eq(recurringRules.publicId, publicId),
          eq(recurringRules.version, expectedVersion),
          isNull(recurringRules.deletedAt),
        ),
      )
      .returning({ id: recurringRules.publicId, version: recurringRules.version });
    const rule = rows[0] ?? this.versionConflict();
    return { ...rule, paused };
  }

  async update(
    publicId: string,
    input: Parameters<IRecurringRepository["update"]>[1],
  ): Promise<RecurringRuleView> {
    const current = await this.requireRule(publicId);
    if (current.rule.version !== input.expectedVersion) this.versionConflict();
    const rows = await this.database
      .update(recurringRules)
      .set({
        description: input.description,
        amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
        frequency: input.frequency,
        interval: input.interval,
        ...(Object.hasOwn(input, "dayOfMonth") ? { dayOfMonth: input.dayOfMonth ?? null } : {}),
        ...(Object.hasOwn(input, "dayOfWeek") ? { dayOfWeek: input.dayOfWeek ?? null } : {}),
        ...(Object.hasOwn(input, "endsOn") ? { endsOn: input.endsOn ?? null } : {}),
        timezone: input.timezone,
        version: sql`${recurringRules.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringRules.id, current.rule.id),
          eq(recurringRules.version, input.expectedVersion),
        ),
      )
      .returning();
    const rule = rows[0] ?? this.versionConflict();
    const mapped = mapRule({ ...current, rule });
    await this.writeEvent("RecurringRuleUpdated", publicId, rule.version, {
      id: publicId,
      version: rule.version,
    });
    return mapped;
  }

  async delete(publicId: string, expectedVersion: number, deletePlannedOccurrences: boolean) {
    const rows = await this.database
      .update(recurringRules)
      .set({
        deletedAt: new Date(),
        version: sql`${recurringRules.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringRules.workspaceId, this.context.workspaceId),
          eq(recurringRules.publicId, publicId),
          eq(recurringRules.version, expectedVersion),
          isNull(recurringRules.deletedAt),
        ),
      )
      .returning({ version: recurringRules.version });
    const removed = rows[0] ?? this.versionConflict();
    if (deletePlannedOccurrences) await this.removePlannedCardOccurrences(publicId);
    if (deletePlannedOccurrences)
      await this.database
        .update(transactions)
        .set({
          deletedAt: new Date(),
          version: sql`${transactions.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.workspaceId, this.context.workspaceId),
            eq(transactions.sourceModule, transactionSource.recurring),
            eq(transactions.sourcePublicId, publicId),
            eq(transactions.status, "PLANNED"),
            isNull(transactions.deletedAt),
          ),
        );
    await this.writeEvent("RecurringRuleDeleted", publicId, removed.version, {
      id: publicId,
      deletePlannedOccurrences,
      version: removed.version,
    });
    return { id: publicId, deleted: true as const, version: removed.version };
  }

  private async requireRule(publicId: string): Promise<JoinedRecurringRow> {
    const rows = await this.database
      .select({
        rule: recurringRules,
        accountId: accounts.publicId,
        creditCardId: creditCards.publicId,
        creditCardName: creditCards.name,
        categoryId: categories.publicId,
      })
      .from(recurringRules)
      .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
      .leftJoin(creditCards, eq(creditCards.id, recurringRules.creditCardId))
      .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
      .where(
        and(
          eq(recurringRules.workspaceId, this.context.workspaceId),
          eq(recurringRules.publicId, publicId),
          isNull(recurringRules.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? this.versionConflict();
  }

  private async removePlannedCardOccurrences(publicId: string): Promise<void> {
    const rows = await this.database
      .select({
        transactionId: transactions.id,
        amountCents: transactions.amountCents,
        statementId: cardStatements.id,
        statementPublicId: cardStatements.publicId,
        totalCents: cardStatements.totalCents,
        paidCents: cardStatements.paidCents,
        dueOn: cardStatements.dueOn,
        accountId: creditCards.paymentAccountId,
        cardName: creditCards.name,
        currency: creditCards.currency,
      })
      .from(transactions)
      .innerJoin(statementCycles, eq(statementCycles.transactionId, transactions.id))
      .innerJoin(cardStatements, eq(cardStatements.id, statementCycles.statementId))
      .innerJoin(creditCards, eq(creditCards.id, cardStatements.cardId))
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          inArray(transactions.sourceModule, cardRecurringSources),
          eq(transactions.sourcePublicId, publicId),
          eq(transactions.status, "PLANNED"),
          eq(cardStatements.status, "OPEN"),
          isNull(transactions.deletedAt),
        ),
      );
    if (rows.length === 0) return;

    const totals = new Map<bigint, (typeof rows)[number] & Readonly<{ removedCents: bigint }>>();
    for (const row of rows) {
      const current = totals.get(row.statementId);
      totals.set(row.statementId, {
        ...row,
        removedCents: (current?.removedCents ?? 0n) + row.amountCents,
      });
    }
    const lockedUpdates: Array<
      Readonly<{
        statement: (typeof rows)[number];
        totalCents: bigint;
        paidCents: bigint;
      }>
    > = [];
    const orderedStatements = [...totals.values()].sort((left, right) =>
      left.statementId < right.statementId ? -1 : left.statementId > right.statementId ? 1 : 0,
    );
    for (const statement of orderedStatements) {
      const lockedStatement = (
        await this.database
          .select({
            status: cardStatements.status,
            totalCents: cardStatements.totalCents,
            paidCents: cardStatements.paidCents,
          })
          .from(cardStatements)
          .where(eq(cardStatements.id, statement.statementId))
          .limit(1)
          .for("update")
      )[0];
      if (!lockedStatement) throw new Error("Recurring statement lock target was not found.");
      if (lockedStatement.status !== "OPEN")
        throw new ApplicationError("A recorrência possui uma fatura que já foi fechada.", {
          category: "conflict",
          code: "RECURRENCE_STATEMENT_IMMUTABLE",
        });
      const totalCents = lockedStatement.totalCents - statement.removedCents;
      if (totalCents < lockedStatement.paidCents)
        throw new ApplicationError(
          "A recorrência não pode reduzir a fatura abaixo do valor pago.",
          {
            category: "conflict",
            code: "RECURRENCE_STATEMENT_ALREADY_PAID",
          },
        );
      lockedUpdates.push({ statement, totalCents, paidCents: lockedStatement.paidCents });
    }
    await this.database.delete(statementCycles).where(
      inArray(
        statementCycles.transactionId,
        rows.map(({ transactionId }) => transactionId),
      ),
    );
    await this.database
      .update(transactions)
      .set({
        deletedAt: new Date(),
        version: sql`${transactions.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        inArray(
          transactions.id,
          rows.map(({ transactionId }) => transactionId),
        ),
      );
    for (const { statement, totalCents, paidCents } of lockedUpdates) {
      const updatedStatement = (
        await this.database
          .update(cardStatements)
          .set({ totalCents, updatedAt: new Date() })
          .where(eq(cardStatements.id, statement.statementId))
          .returning({ totalCents: cardStatements.totalCents })
      )[0];
      if (!updatedStatement) throw new Error("Recurring statement total was not updated.");
      if (statement.accountId)
        await this.projection.sync({
          statementId: statement.statementPublicId,
          accountId: statement.accountId,
          cardName: statement.cardName,
          currency: statement.currency,
          dueOn: statement.dueOn,
          totalCents: updatedStatement.totalCents,
          paidCents,
        });
    }
  }
  private versionConflict(): never {
    throw new ApplicationError("Regra não encontrada ou desatualizada.", {
      category: "conflict",
      code: "VERSION_CONFLICT",
    });
  }
  private async writeEvent(
    name: string,
    aggregateId: string,
    version: number,
    payload: unknown,
  ): Promise<void> {
    await this.database.insert(outboxEvents).values({
      eventId: this.generateId(),
      workspaceId: this.context.workspaceId,
      eventName: name,
      eventVersion: 1,
      aggregateType: "recurring_rule",
      aggregatePublicId: aggregateId,
      aggregateVersion: version,
      correlationId: this.generateId(),
      payload,
      occurredAt: new Date(),
    });
  }
}
