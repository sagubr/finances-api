import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import {
  outboxEvents,
  workspaces,
} from "#/modules/platform/infrastructure/database/platform.schema.js";
import type {
  ITransactionRepository,
  MonthlyTransactionEntry,
} from "#/modules/transactions/application/ports/transaction.repository.js";
import type {
  ListTransactionsQuery,
  TransactionInput,
  TransactionPatch,
  TransactionView,
  TransferInput,
  TransferView,
} from "#/modules/transactions/dtos/transaction.dto.js";
import {
  accounts,
  categories,
  transactionHistory,
  transactions,
  transferPairs,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

type TransactionRow = typeof transactions.$inferSelect;
type JoinedTransaction = Readonly<{
  transaction: TransactionRow;
  accountPublicId: string;
  categoryPublicId: string | null;
}>;

const safeMoney = (value: bigint): number => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount))
    throw new Error("Persisted monetary value exceeds safe range.");
  return amount;
};

const mapTransaction = (row: JoinedTransaction): TransactionView => ({
  id: row.transaction.publicId,
  accountId: row.accountPublicId,
  categoryId: row.categoryPublicId,
  type: row.transaction.type,
  status: row.transaction.status,
  amountCents: safeMoney(row.transaction.amountCents),
  currency: row.transaction.currency,
  description: row.transaction.description,
  occurredOn: row.transaction.occurredOn,
  competenceMonth: row.transaction.competenceMonth,
  settledOn: row.transaction.settledOn,
  sourceModule: row.transaction.sourceModule,
  sourcePublicId: row.transaction.sourcePublicId,
  version: row.transaction.version,
  deletedAt: row.transaction.deletedAt?.toISOString() ?? null,
});

export class TransactionRepository implements ITransactionRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
    private readonly generateId: () => string,
  ) {}

  async list(query: ListTransactionsQuery) {
    const cursor = query.cursor
      ? Buffer.from(query.cursor, "base64url").toString("utf8").split("|")
      : [];
    const conditions = [
      eq(transactions.workspaceId, this.context.workspaceId),
      isNull(transactions.deletedAt),
      ...(query.month ? [eq(transactions.competenceMonth, query.month)] : []),
      ...(query.accountId ? [eq(accounts.publicId, query.accountId)] : []),
      ...(query.categoryId ? [eq(categories.publicId, query.categoryId)] : []),
      ...(query.type ? [eq(transactions.type, query.type)] : []),
      ...(query.status ? [eq(transactions.status, query.status)] : []),
      ...(query.search
        ? [
            ilike(
              transactions.description,
              `%${query.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
            ),
          ]
        : []),
      ...(cursor[0] && cursor[1]
        ? [
            sql`(${transactions.occurredOn}, ${transactions.id}) < (${cursor[0]}::date, ${cursor[1]}::bigint)`,
          ]
        : []),
    ];
    const rows = await this.database
      .select({
        transaction: transactions,
        accountPublicId: accounts.publicId,
        categoryPublicId: categories.publicId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredOn), desc(transactions.id))
      .limit(query.limit + 1);
    const hasNextPage = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1)?.transaction;
    return {
      items: page.map(mapTransaction),
      pageInfo: {
        nextCursor:
          hasNextPage && last
            ? Buffer.from(`${last.occurredOn}|${last.id.toString()}`).toString("base64url")
            : null,
        hasNextPage,
      },
    };
  }

  async find(publicId: string): Promise<TransactionView> {
    return mapTransaction(await this.requireRow(publicId));
  }

  async create(publicId: string, input: TransactionInput): Promise<TransactionView> {
    const account = await this.requireAccount(input.accountId, input.currency);
    const category = await this.resolveCategory(input.categoryId, input.type);
    const inserted = await this.database
      .insert(transactions)
      .values({
        publicId,
        workspaceId: this.context.workspaceId,
        accountId: account.id,
        categoryId: category?.id,
        type: input.type,
        status: input.status,
        amountCents: BigInt(input.amountCents),
        currency: input.currency,
        description: input.description,
        occurredOn: input.occurredOn,
        competenceMonth: input.occurredOn.slice(0, 7),
        settledOn: input.status === "SETTLED" ? input.occurredOn : null,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error("Transaction insert did not return a row.");
    const mapped = mapTransaction({
      transaction: row,
      accountPublicId: input.accountId,
      categoryPublicId: input.categoryId ?? null,
    });
    await this.writeHistory(row.id, "CREATED", mapped);
    await this.writeEvent("TransactionCreated", mapped);
    return mapped;
  }

  async update(publicId: string, input: TransactionPatch): Promise<TransactionView> {
    const current = await this.requireRow(publicId);
    this.rejectTransfer(current.transaction);
    this.rejectCardManagedTransaction(current.transaction);
    this.requireVersion(current.transaction, input.expectedVersion);
    const accountId = input.accountId ?? current.accountPublicId;
    const account = await this.requireAccount(accountId, current.transaction.currency);
    const categoryPublicId =
      input.categoryId === undefined ? current.categoryPublicId : input.categoryId;
    const category = await this.resolveCategory(
      categoryPublicId ?? undefined,
      current.transaction.type,
    );
    const updated = await this.database
      .update(transactions)
      .set({
        accountId: account.id,
        categoryId: category?.id ?? null,
        amountCents: input.amountCents === undefined ? undefined : BigInt(input.amountCents),
        description: input.description,
        occurredOn: input.occurredOn,
        competenceMonth: input.occurredOn?.slice(0, 7),
        settledOn:
          input.occurredOn !== undefined && current.transaction.status === "SETTLED"
            ? input.occurredOn
            : undefined,
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, current.transaction.id),
          eq(transactions.version, input.expectedVersion),
        ),
      )
      .returning();
    const row = updated[0] ?? this.throwVersionConflict(current.transaction.version);
    const mapped = mapTransaction({
      transaction: row,
      accountPublicId: accountId,
      categoryPublicId: categoryPublicId ?? null,
    });
    await this.writeHistory(row.id, "UPDATED", mapped);
    await this.writeEvent("TransactionUpdated", mapped);
    return mapped;
  }

  async changeStatus(publicId: string, expectedVersion: number, status: "CONFIRMED" | "SETTLED") {
    const current = await this.requireRow(publicId);
    this.rejectCardManagedTransaction(current.transaction);
    this.requireVersion(current.transaction, expectedVersion);
    const expectedCurrentStatus = status === "CONFIRMED" ? "PLANNED" : "CONFIRMED";
    if (current.transaction.status !== expectedCurrentStatus)
      throw new ApplicationError("A transição de situação solicitada não é permitida.", {
        category: "validation",
        code: "TRANSACTION_STATUS_TRANSITION_INVALID",
        details: { currentStatus: current.transaction.status, targetStatus: status },
      });
    if (current.transaction.type === "TRANSFER")
      return this.changeTransferPairStatus(current, expectedVersion, status, expectedCurrentStatus);
    const rows = await this.database
      .update(transactions)
      .set({
        status,
        settledOn: status === "SETTLED" ? current.transaction.occurredOn : null,
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactions.id, current.transaction.id), eq(transactions.version, expectedVersion)),
      )
      .returning();
    const row = rows[0] ?? this.throwVersionConflict(current.transaction.version);
    const mapped = mapTransaction({ ...current, transaction: row });
    await this.writeHistory(row.id, status === "SETTLED" ? "SETTLED" : "CONFIRMED", mapped);
    await this.writeEvent(
      status === "SETTLED" ? "TransactionSettled" : "TransactionConfirmed",
      mapped,
    );
    return mapped;
  }

  async revertStatus(publicId: string, expectedVersion: number): Promise<TransactionView> {
    const current = await this.requireRow(publicId);
    this.rejectTransfer(current.transaction);
    this.rejectCardManagedTransaction(current.transaction);
    this.requireVersion(current.transaction, expectedVersion);
    const targetStatus =
      current.transaction.status === "SETTLED"
        ? "CONFIRMED"
        : current.transaction.status === "CONFIRMED"
          ? "PLANNED"
          : null;
    if (!targetStatus)
      throw new ApplicationError("A transação planejada não possui um estado para reverter.", {
        category: "validation",
        code: "TRANSACTION_STATUS_CANNOT_BE_REVERTED",
      });
    if (current.transaction.type === "TRANSFER")
      return this.changeTransferPairStatus(
        current,
        expectedVersion,
        targetStatus,
        current.transaction.status,
      );
    const rows = await this.database
      .update(transactions)
      .set({
        status: targetStatus,
        settledOn: null,
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactions.id, current.transaction.id), eq(transactions.version, expectedVersion)),
      )
      .returning();
    const row = rows[0] ?? this.throwVersionConflict(current.transaction.version);
    const mapped = mapTransaction({ ...current, transaction: row });
    await this.writeHistory(row.id, "STATUS_REVERTED", mapped);
    await this.writeEvent("TransactionStatusReverted", mapped);
    return mapped;
  }

  async delete(publicId: string, expectedVersion: number): Promise<void> {
    const current = await this.requireRow(publicId);
    this.rejectTransfer(current.transaction);
    this.rejectCardManagedTransaction(current.transaction);
    this.requireVersion(current.transaction, expectedVersion);
    const rows = await this.database
      .update(transactions)
      .set({
        deletedAt: new Date(),
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactions.id, current.transaction.id), eq(transactions.version, expectedVersion)),
      )
      .returning();
    const updated = rows[0] ?? this.throwVersionConflict(current.transaction.version);
    const mapped = mapTransaction({ ...current, transaction: updated });
    await this.writeHistory(updated.id, "DELETED", mapped);
    await this.writeEvent("TransactionDeleted", { id: publicId, version: updated.version });
  }

  async restore(publicId: string, expectedVersion: number): Promise<TransactionView> {
    const current = await this.requireRow(publicId, true);
    this.rejectTransfer(current.transaction);
    this.rejectCardManagedTransaction(current.transaction);
    if (!current.transaction.deletedAt) return mapTransaction(current);
    this.requireVersion(current.transaction, expectedVersion);
    const rows = await this.database
      .update(transactions)
      .set({
        deletedAt: null,
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(transactions.id, current.transaction.id), eq(transactions.version, expectedVersion)),
      )
      .returning();
    const row = rows[0] ?? this.throwVersionConflict(current.transaction.version);
    const mapped = mapTransaction({ ...current, transaction: row });
    await this.writeHistory(row.id, "RESTORED", mapped);
    await this.writeEvent("TransactionRestored", mapped);
    return mapped;
  }

  async createTransfer(
    ids: Readonly<{ pair: string; debit: string; credit: string }>,
    input: TransferInput,
  ): Promise<TransferView> {
    const debitAccount = await this.requireAccount(input.fromAccountId, input.currency);
    const creditAccount = await this.requireAccount(input.toAccountId, input.currency);
    const shared = {
      workspaceId: this.context.workspaceId,
      type: "TRANSFER" as const,
      status: input.status,
      amountCents: BigInt(input.amountCents),
      currency: input.currency,
      description: input.description,
      occurredOn: input.occurredOn,
      competenceMonth: input.occurredOn.slice(0, 7),
      settledOn: input.status === "SETTLED" ? input.occurredOn : null,
      sourceModule: "TX",
      sourcePublicId: ids.pair,
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    };
    const legs = await this.database
      .insert(transactions)
      .values([
        { ...shared, publicId: ids.debit, accountId: debitAccount.id, sourceSequence: 1 },
        { ...shared, publicId: ids.credit, accountId: creditAccount.id, sourceSequence: 2 },
      ])
      .returning({ id: transactions.id, publicId: transactions.publicId });
    const debit = legs.find((leg) => leg.publicId === ids.debit);
    const credit = legs.find((leg) => leg.publicId === ids.credit);
    if (!debit || !credit) throw new Error("Transfer insert did not return both legs.");
    await this.database.insert(transferPairs).values({
      publicId: ids.pair,
      workspaceId: this.context.workspaceId,
      debitTransactionId: debit.id,
      creditTransactionId: credit.id,
    });
    const transferSnapshot = (id: string, accountId: string): TransactionView => ({
      id,
      accountId,
      categoryId: null,
      type: "TRANSFER",
      status: input.status,
      amountCents: input.amountCents,
      currency: input.currency,
      description: input.description,
      occurredOn: input.occurredOn,
      competenceMonth: input.occurredOn.slice(0, 7),
      settledOn: input.status === "SETTLED" ? input.occurredOn : null,
      sourceModule: "TX",
      sourcePublicId: ids.pair,
      version: 1,
      deletedAt: null,
    });
    await this.writeHistory(debit.id, "CREATED", transferSnapshot(ids.debit, input.fromAccountId));
    await this.writeHistory(credit.id, "CREATED", transferSnapshot(ids.credit, input.toAccountId));
    await this.writeEvent("TransactionCreated", {
      id: ids.debit,
      type: "TRANSFER",
      direction: "OUT",
      pairId: ids.pair,
      amountCents: input.amountCents,
      currency: input.currency,
      version: 1,
    });
    await this.writeEvent("TransactionCreated", {
      id: ids.credit,
      type: "TRANSFER",
      direction: "IN",
      pairId: ids.pair,
      amountCents: input.amountCents,
      currency: input.currency,
      version: 1,
    });
    return {
      id: ids.pair,
      debitTransactionId: ids.debit,
      creditTransactionId: ids.credit,
      amountCents: input.amountCents,
      currency: input.currency,
      version: 1,
    };
  }

  async listMonthlyEntries(month: string): Promise<readonly MonthlyTransactionEntry[]> {
    const rows = await this.database
      .select({
        type: transactions.type,
        status: transactions.status,
        amountCents: transactions.amountCents,
        deletedAt: transactions.deletedAt,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(workspaces, eq(workspaces.id, accounts.workspaceId))
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.competenceMonth, month),
          eq(transactions.currency, workspaces.baseCurrency),
          sql`${accounts.type} <> 'BENEFIT'`,
        ),
      );
    return rows.map((row) => ({
      type: row.type,
      status: row.status,
      amountCents: row.amountCents,
      deleted: row.deletedAt !== null,
    }));
  }

  private async requireRow(publicId: string, includeDeleted = false): Promise<JoinedTransaction> {
    const rows = await this.database
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
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.publicId, publicId),
          ...(includeDeleted ? [] : [isNull(transactions.deletedAt)]),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row) return row;
    throw new ApplicationError("Transação não encontrada.", {
      category: "not-found",
      code: "TRANSACTION_NOT_FOUND",
    });
  }

  private async requireAccount(publicId: string, currency: string) {
    const rows = await this.database
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.workspaceId, this.context.workspaceId),
          eq(accounts.publicId, publicId),
          eq(accounts.currency, currency),
          eq(accounts.active, true),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);
    const account = rows[0];
    if (account) return account;
    throw new ApplicationError("Conta ou moeda incompatível.", {
      category: "validation",
      code: "TRANSACTION_RELATION_INVALID",
    });
  }

  private async resolveCategory(publicId: string | undefined, type: TransactionRow["type"]) {
    if (!publicId) return null;
    if (type !== "INCOME" && type !== "EXPENSE")
      throw new ApplicationError("Categoria incompatível.", {
        category: "validation",
        code: "TRANSACTION_RELATION_INVALID",
      });
    const rows = await this.database
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.workspaceId, this.context.workspaceId),
          eq(categories.publicId, publicId),
          eq(categories.type, type),
          eq(categories.active, true),
        ),
      )
      .limit(1);
    const category = rows[0];
    if (category) return category;
    throw new ApplicationError("Categoria incompatível.", {
      category: "validation",
      code: "TRANSACTION_RELATION_INVALID",
    });
  }

  private rejectTransfer(row: TransactionRow): void {
    if (row.type !== "TRANSFER") return;
    throw new ApplicationError("Use o endpoint de transferências.", {
      category: "validation",
      code: "TRANSFER_COMMAND_REQUIRED",
    });
  }

  private async changeTransferPairStatus(
    current: JoinedTransaction,
    expectedVersion: number,
    targetStatus: "PLANNED" | "CONFIRMED" | "SETTLED",
    expectedCurrentStatus: "PLANNED" | "CONFIRMED" | "SETTLED",
  ): Promise<TransactionView> {
    const pair = (
      await this.database
        .select({
          debitTransactionId: transferPairs.debitTransactionId,
          creditTransactionId: transferPairs.creditTransactionId,
        })
        .from(transferPairs)
        .where(
          and(
            eq(transferPairs.workspaceId, this.context.workspaceId),
            or(
              eq(transferPairs.debitTransactionId, current.transaction.id),
              eq(transferPairs.creditTransactionId, current.transaction.id),
            ),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!pair)
      throw new ApplicationError("O par da transferência não foi encontrado.", {
        category: "conflict",
        code: "TRANSFER_PAIR_INCONSISTENT",
      });
    const rows = await this.database
      .update(transactions)
      .set({
        status: targetStatus,
        settledOn: targetStatus === "SETTLED" ? current.transaction.occurredOn : null,
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          inArray(transactions.id, [pair.debitTransactionId, pair.creditTransactionId]),
          eq(transactions.version, expectedVersion),
          eq(transactions.status, expectedCurrentStatus),
          isNull(transactions.deletedAt),
        ),
      )
      .returning();
    if (rows.length !== 2) this.throwVersionConflict(current.transaction.version);
    const updatedPairs = await this.database
      .select({ transaction: transactions, accountPublicId: accounts.publicId })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(inArray(transactions.id, [pair.debitTransactionId, pair.creditTransactionId]));
    const snapshots = updatedPairs.map(({ transaction, accountPublicId }) =>
      mapTransaction({ transaction, accountPublicId, categoryPublicId: null }),
    );
    const selected = snapshots.find(({ id }) => id === current.transaction.publicId);
    if (!selected) throw new Error("Transfer status update did not return the selected leg.");
    const confirming = targetStatus === "CONFIRMED" && expectedCurrentStatus === "PLANNED";
    const action =
      targetStatus === "SETTLED" ? "SETTLED" : confirming ? "CONFIRMED" : "STATUS_REVERTED";
    const transactionIds = new Map(rows.map(({ publicId, id }) => [publicId, id]));
    for (const snapshot of snapshots) {
      const transactionId = transactionIds.get(snapshot.id);
      if (!transactionId) throw new Error("Transfer status history target was not returned.");
      await this.writeHistory(transactionId, action, snapshot);
      await this.writeEvent(
        targetStatus === "SETTLED"
          ? "TransactionSettled"
          : confirming
            ? "TransactionConfirmed"
            : "TransactionStatusReverted",
        snapshot,
      );
    }
    return selected;
  }

  private rejectCardManagedTransaction(row: TransactionRow): void {
    if (!row.sourceModule?.startsWith("CC")) return;
    throw new ApplicationError("Use os comandos de cartão ou fatura para alterar esta transação.", {
      category: "validation",
      code: "CARD_COMMAND_REQUIRED",
    });
  }

  private requireVersion(row: TransactionRow, expectedVersion: number): void {
    if (row.version === expectedVersion) return;
    this.throwVersionConflict(row.version);
  }

  private throwVersionConflict(currentVersion: number): never {
    throw new ApplicationError("A transação foi alterada por outra operação.", {
      category: "conflict",
      code: "VERSION_CONFLICT",
      details: { currentVersion },
    });
  }

  private async writeEvent(eventName: string, payload: unknown): Promise<void> {
    const event = payload as { id: string; version: number };
    await this.database.insert(outboxEvents).values({
      eventId: this.generateId(),
      workspaceId: this.context.workspaceId,
      eventName,
      eventVersion: 1,
      aggregateType: "transaction",
      aggregatePublicId: event.id,
      aggregateVersion: event.version,
      correlationId: this.generateId(),
      payload,
      occurredAt: new Date(),
    });
  }

  private async writeHistory(
    transactionId: bigint,
    action: string,
    snapshot: TransactionView,
  ): Promise<void> {
    await this.database.insert(transactionHistory).values({
      workspaceId: this.context.workspaceId,
      transactionId,
      transactionPublicId: snapshot.id,
      version: snapshot.version,
      action,
      actorId: this.context.userId,
      snapshot,
    });
  }
}
