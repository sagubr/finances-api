import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import { outboxEvents } from "#/modules/platform/infrastructure/database/platform.schema.js";
import type {
  AutomaticSettlementResult,
  ITransactionJobRepository,
} from "#/modules/transactions/application/ports/transaction-job.repository.js";
import {
  accounts,
  categories,
  transactionHistory,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { and, eq, isNull, lt, ne, or, sql } from "drizzle-orm";

type TransactionRow = typeof transactions.$inferSelect;

const safeMoney = (value: bigint): number => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount))
    throw new Error("Persisted monetary value exceeds safe range.");
  return amount;
};

export class TransactionJobRepository implements ITransactionJobRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
    private readonly generateId: () => string,
  ) {}

  async settleOverdue(referenceOn: string): Promise<AutomaticSettlementResult> {
    const overdue = await this.database
      .select({
        transaction: transactions,
        accountPublicId: accounts.publicId,
        categoryPublicId: categories.publicId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.workspaceId, this.workspaceId),
          isNull(transactions.deletedAt),
          lt(transactions.occurredOn, referenceOn),
          ne(transactions.status, "SETTLED"),
          or(isNull(transactions.sourceModule), sql`${transactions.sourceModule} not like 'CC%'`),
        ),
      )
      .orderBy(transactions.occurredOn, transactions.id)
      .for("update", { of: transactions });

    let confirmed = 0;
    let settled = 0;
    for (const selected of overdue) {
      let current = selected.transaction;
      if (current.status === "PLANNED") {
        current = await this.transition(current, "CONFIRMED", selected.accountPublicId, selected.categoryPublicId);
        confirmed++;
      }
      if (current.status === "CONFIRMED") {
        await this.transition(current, "SETTLED", selected.accountPublicId, selected.categoryPublicId);
        settled++;
      }
    }
    return { confirmed, settled };
  }

  private async transition(
    current: TransactionRow,
    status: "CONFIRMED" | "SETTLED",
    accountPublicId: string,
    categoryPublicId: string | null,
  ): Promise<TransactionRow> {
    const updated = (
      await this.database
        .update(transactions)
        .set({
          status,
          settledOn: status === "SETTLED" ? current.occurredOn : null,
          version: sql`${transactions.version} + 1`,
          updatedBy: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.id, current.id),
            eq(transactions.version, current.version),
            eq(transactions.status, current.status),
          ),
        )
        .returning()
    )[0];
    if (!updated) throw new Error("Overdue transaction changed while it was being settled.");

    const snapshot = {
      id: updated.publicId,
      accountId: accountPublicId,
      categoryId: categoryPublicId,
      type: updated.type,
      status: updated.status,
      amountCents: safeMoney(updated.amountCents),
      currency: updated.currency,
      description: updated.description,
      occurredOn: updated.occurredOn,
      competenceMonth: updated.competenceMonth,
      settledOn: updated.settledOn,
      sourceModule: updated.sourceModule,
      sourcePublicId: updated.sourcePublicId,
      version: updated.version,
      deletedAt: updated.deletedAt?.toISOString() ?? null,
    };
    const action = status === "SETTLED" ? "SETTLED" : "CONFIRMED";
    await this.database.insert(transactionHistory).values({
      workspaceId: this.workspaceId,
      transactionId: updated.id,
      transactionPublicId: updated.publicId,
      version: updated.version,
      action,
      actorId: null,
      snapshot,
    });
    await this.database.insert(outboxEvents).values({
      eventId: this.generateId(),
      workspaceId: this.workspaceId,
      eventName: status === "SETTLED" ? "TransactionSettled" : "TransactionConfirmed",
      eventVersion: 1,
      aggregateType: "transaction",
      aggregatePublicId: updated.publicId,
      aggregateVersion: updated.version,
      correlationId: this.generateId(),
      payload: { ...snapshot, automatedBy: "overdue-transaction-job" },
      occurredAt: new Date(),
    });
    return updated;
  }
}
