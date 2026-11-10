import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { ICardRepository } from "#/modules/planning/application/ports/card.repository.js";
import type {
  CardPatch,
  CreditCardView,
  StatementSummary,
} from "#/modules/planning/dtos/planning.dto.js";
import {
  cardStatements,
  creditCards,
  installmentPlans,
  recurringRules,
  statementCycles,
  statementPayments,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import {
  outboxEvents,
  workspaces,
} from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  transactionHistory,
  transactionLocations,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import {
  isManualCardPurchaseSource,
  legacyCardSources,
  transactionSource,
} from "#/modules/transactions/public/transaction-source.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { CardStatementProjectionWriter } from "./card-statement-projection.writer.js";
import { materializeOpenCardStatement } from "./open-card-statement.js";

const safeMoney = (value: bigint): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error("Persisted monetary value exceeds safe range.");
  return number;
};
const mapCard = (
  card: typeof creditCards.$inferSelect,
  paymentAccountId: string | null,
): CreditCardView => ({
  id: card.publicId,
  name: card.name,
  lastFour: card.lastFour,
  paymentAccountId,
  currency: card.currency,
  limitCents: safeMoney(card.limitCents),
  closingDay: card.closingDay,
  dueDay: card.dueDay,
  accountingMode: card.accountingMode,
  active: card.active,
  version: card.version,
});
const mapStatement = (statement: typeof cardStatements.$inferSelect): StatementSummary => ({
  id: statement.publicId,
  cycleStartOn: statement.cycleStartOn,
  cycleEndOn: statement.cycleEndOn,
  dueOn: statement.dueOn,
  status: statement.status,
  totalCents: safeMoney(statement.totalCents),
  paidCents: safeMoney(statement.paidCents),
  version: statement.version,
});

export class CardRepository implements ICardRepository {
  private readonly projection: CardStatementProjectionWriter;

  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
    private readonly generateId: () => string,
  ) {
    this.projection = new CardStatementProjectionWriter(database, context, generateId);
  }

  async listCards(query: Parameters<ICardRepository["listCards"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({ card: creditCards, paymentAccountId: accounts.publicId })
      .from(creditCards)
      .leftJoin(accounts, eq(accounts.id, creditCards.paymentAccountId))
      .where(
        and(
          eq(creditCards.workspaceId, this.context.workspaceId),
          eq(creditCards.active, true),
          ...(cursor ? [lt(creditCards.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(creditCards.publicId))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map(({ card, paymentAccountId }) => mapCard(card, paymentAccountId)),
      query.limit,
    );
  }

  async createCard(publicId: string, input: Parameters<ICardRepository["createCard"]>[1]) {
    await this.requireWorkspaceCurrency(input.currency);
    const paymentAccount = input.paymentAccountId
      ? (
          await this.database
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.workspaceId, this.context.workspaceId),
                eq(accounts.publicId, input.paymentAccountId),
                eq(accounts.currency, input.currency),
                eq(accounts.active, true),
                isNull(accounts.deletedAt),
              ),
            )
            .limit(1)
        )[0]
      : null;
    if (input.paymentAccountId && !paymentAccount)
      throw new ApplicationError("Conta de pagamento inválida.", {
        category: "validation",
        code: "CARD_ACCOUNT_INVALID",
      });
    const rows = await this.database
      .insert(creditCards)
      .values({
        publicId,
        workspaceId: this.context.workspaceId,
        name: input.name,
        lastFour: input.lastFour,
        currency: input.currency,
        limitCents: BigInt(input.limitCents),
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        accountingMode: input.accountingMode,
        paymentAccountId: paymentAccount?.id,
      })
      .returning();
    const card = rows[0];
    if (!card) throw new Error("Credit card insert did not return a row.");
    return mapCard(card, input.paymentAccountId ?? null);
  }

  async updateCard(publicId: string, input: CardPatch) {
    const current = (
      await this.database
        .select()
        .from(creditCards)
        .where(
          and(
            eq(creditCards.workspaceId, this.context.workspaceId),
            eq(creditCards.publicId, publicId),
            eq(creditCards.active, true),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!current || current.version !== input.expectedVersion)
      this.versionConflict("O cartão foi alterado por outra operação.", current?.version);
    const currentPaymentAccountPublicId = current.paymentAccountId
      ? (
          await this.database
            .select({ publicId: accounts.publicId })
            .from(accounts)
            .where(eq(accounts.id, current.paymentAccountId))
            .limit(1)
        )[0]?.publicId
      : undefined;
    const paymentAccountChange =
      input.paymentAccountId !== undefined &&
      input.paymentAccountId !== currentPaymentAccountPublicId;
    const structuralChange =
      input.currency !== current.currency ||
      input.closingDay !== current.closingDay ||
      input.dueDay !== current.dueDay ||
      input.accountingMode !== current.accountingMode ||
      paymentAccountChange;
    if (structuralChange) {
      const materializedStatement = (
        await this.database
          .select({ id: cardStatements.id })
          .from(cardStatements)
          .where(
            and(
              eq(cardStatements.workspaceId, this.context.workspaceId),
              eq(cardStatements.cardId, current.id),
            ),
          )
          .limit(1)
      )[0];
      const recurringDependency = (
        await this.database
          .select({ id: recurringRules.id })
          .from(recurringRules)
          .where(
            and(
              eq(recurringRules.workspaceId, this.context.workspaceId),
              eq(recurringRules.creditCardId, current.id),
              isNull(recurringRules.deletedAt),
            ),
          )
          .limit(1)
      )[0];
      const installmentDependency = (
        await this.database
          .select({ id: installmentPlans.id })
          .from(installmentPlans)
          .where(
            and(
              eq(installmentPlans.workspaceId, this.context.workspaceId),
              eq(installmentPlans.creditCardId, current.id),
            ),
          )
          .limit(1)
      )[0];
      if (materializedStatement || recurringDependency || installmentDependency)
        throw new ApplicationError(
          "Conta de pagamento, moeda, fechamento, vencimento e modo contábil não podem mudar após a primeira fatura, recorrência ou parcelamento.",
          { category: "conflict", code: "CARD_STRUCTURE_IMMUTABLE" },
        );
    }
    await this.requireWorkspaceCurrency(input.currency);
    const paymentAccount = input.paymentAccountId
      ? (
          await this.database
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.workspaceId, this.context.workspaceId),
                eq(accounts.publicId, input.paymentAccountId),
                eq(accounts.currency, input.currency),
                eq(accounts.active, true),
                isNull(accounts.deletedAt),
              ),
            )
            .limit(1)
        )[0]
      : null;
    if (input.paymentAccountId && !paymentAccount)
      throw new ApplicationError("Conta de pagamento inválida.", {
        category: "validation",
        code: "CARD_ACCOUNT_INVALID",
      });
    const rows = await this.database
      .update(creditCards)
      .set({
        name: input.name,
        lastFour: input.lastFour ?? null,
        currency: input.currency,
        limitCents: BigInt(input.limitCents),
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        accountingMode: input.accountingMode,
        ...(input.paymentAccountId !== undefined
          ? { paymentAccountId: paymentAccount?.id ?? null }
          : {}),
        version: sql`${creditCards.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(creditCards.workspaceId, this.context.workspaceId),
          eq(creditCards.publicId, publicId),
          eq(creditCards.version, input.expectedVersion),
          eq(creditCards.active, true),
        ),
      )
      .returning();
    const card = rows[0];
    if (!card) this.versionConflict("O cartão foi alterado por outra operação.");
    const preservedPaymentAccountId = card.paymentAccountId
      ? ((
          await this.database
            .select({ publicId: accounts.publicId })
            .from(accounts)
            .where(eq(accounts.id, card.paymentAccountId))
            .limit(1)
        )[0]?.publicId ?? null)
      : null;
    return mapCard(card, input.paymentAccountId ?? preservedPaymentAccountId);
  }

  async deactivateCard(publicId: string, expectedVersion: number) {
    const rows = await this.database
      .update(creditCards)
      .set({
        active: false,
        version: sql`${creditCards.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(creditCards.workspaceId, this.context.workspaceId),
          eq(creditCards.publicId, publicId),
          eq(creditCards.version, expectedVersion),
          eq(creditCards.active, true),
        ),
      )
      .returning({ id: creditCards.id });
    if (!rows[0]) this.versionConflict("O cartão foi alterado por outra operação.");
  }

  async createPurchase(
    cardPublicId: string,
    ids: Readonly<{ statement: string; transaction: string }>,
    input: Parameters<ICardRepository["createPurchase"]>[2],
  ) {
    const card = (
      await this.database
        .select()
        .from(creditCards)
        .where(
          and(
            eq(creditCards.workspaceId, this.context.workspaceId),
            eq(creditCards.publicId, cardPublicId),
            eq(creditCards.active, true),
          ),
        )
        .limit(1)
        .for("share")
    )[0];
    if (!card)
      throw new ApplicationError("Cartão não encontrado.", {
        category: "not-found",
        code: "CARD_NOT_FOUND",
      });
    if (!card.paymentAccountId)
      throw new ApplicationError("Configure a conta de pagamento do cartão.", {
        category: "validation",
        code: "CARD_PAYMENT_ACCOUNT_REQUIRED",
      });
    const paymentAccount = (
      await this.database
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, card.paymentAccountId),
            eq(accounts.workspaceId, this.context.workspaceId),
            eq(accounts.currency, card.currency),
            eq(accounts.active, true),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!paymentAccount)
      throw new ApplicationError("A conta de pagamento do cartão está inativa.", {
        category: "validation",
        code: "CARD_PAYMENT_ACCOUNT_INACTIVE",
      });
    const category = (
      await this.database
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.workspaceId, this.context.workspaceId),
            eq(categories.publicId, input.categoryId),
            eq(categories.type, "EXPENSE"),
            eq(categories.active, true),
          ),
        )
        .limit(1)
    )[0];
    if (!category)
      throw new ApplicationError("Categoria de despesa inválida.", {
        category: "validation",
        code: "CARD_PURCHASE_CATEGORY_INVALID",
      });
    let firstStatementId = true;
    const statement = await materializeOpenCardStatement(this.database, {
      workspaceId: this.context.workspaceId,
      card,
      occurredOn: input.occurredOn,
      generateId: () => {
        if (firstStatementId) {
          firstStatementId = false;
          return ids.statement;
        }
        return this.generateId();
      },
    });
    const sequence = await this.nextPurchaseSequence(statement.publicId);
    const createdTransactions = await this.database
      .insert(transactions)
      .values({
        publicId: ids.transaction,
        workspaceId: this.context.workspaceId,
        accountId: card.paymentAccountId,
        categoryId: category.id,
        type: card.accountingMode === "DETAILED" ? "EXPENSE" : "CARD_PAYMENT",
        status: "CONFIRMED",
        amountCents: BigInt(input.amountCents),
        currency: card.currency,
        description: input.description,
        occurredOn: input.occurredOn,
        competenceMonth: input.occurredOn.slice(0, 7),
        sourceModule: transactionSource.cardPurchase,
        sourcePublicId: statement.publicId,
        sourceSequence: sequence,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    const transaction = createdTransactions[0];
    if (!transaction) throw new Error("Card transaction insert did not return an id.");
    if (input.location) await this.upsertLocation(transaction.id, input.location);
    await this.database.insert(statementCycles).values({
      workspaceId: this.context.workspaceId,
      statementId: statement.id,
      transactionId: transaction.id,
    });
    await this.database
      .update(cardStatements)
      .set({
        totalCents: sql`${cardStatements.totalCents} + ${input.amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(cardStatements.id, statement.id));
    await this.projection.sync({
      statementId: statement.publicId,
      accountId: card.paymentAccountId,
      cardName: card.name,
      currency: card.currency,
      dueOn: statement.dueOn,
      totalCents: statement.totalCents + BigInt(input.amountCents),
      paidCents: statement.paidCents,
    });
    const result = {
      id: ids.transaction,
      cardId: cardPublicId,
      statementId: statement.publicId,
      ...input,
      competenceMonth: input.occurredOn.slice(0, 7),
      currency: card.currency,
      status: "CONFIRMED" as const,
      location: input.location ?? null,
      version: 1,
    };
    await this.writePurchaseHistory(transaction.id, result.id, result.version, "CREATED", result);
    return result;
  }

  async updatePurchase(
    cardPublicId: string,
    purchasePublicId: string,
    input: Parameters<ICardRepository["updatePurchase"]>[2],
  ) {
    const selected = await this.requireEditablePurchase(cardPublicId, purchasePublicId);
    if (selected.transaction.version !== input.expectedVersion)
      this.versionConflict(
        "A compra foi alterada por outra operação.",
        selected.transaction.version,
      );
    const category = (
      await this.database
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.workspaceId, this.context.workspaceId),
            eq(categories.publicId, input.categoryId),
            eq(categories.type, "EXPENSE"),
            eq(categories.active, true),
          ),
        )
        .limit(1)
    )[0];
    if (!category)
      throw new ApplicationError("Categoria de despesa inválida.", {
        category: "validation",
        code: "CARD_PURCHASE_CATEGORY_INVALID",
      });

    const targetStatement = await materializeOpenCardStatement(this.database, {
      workspaceId: this.context.workspaceId,
      card: selected.card,
      occurredOn: input.occurredOn,
      generateId: this.generateId,
    });

    const changedStatement = targetStatement.id !== selected.statement.id;
    const sourceSequence = changedStatement
      ? await this.nextPurchaseSequence(targetStatement.publicId)
      : selected.transaction.sourceSequence;
    const updatedRows = await this.database
      .update(transactions)
      .set({
        categoryId: category.id,
        amountCents: BigInt(input.amountCents),
        description: input.description,
        occurredOn: input.occurredOn,
        competenceMonth: input.occurredOn.slice(0, 7),
        sourcePublicId: targetStatement.publicId,
        sourceSequence,
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, selected.transaction.id),
          eq(transactions.version, input.expectedVersion),
        ),
      )
      .returning();
    const updated =
      updatedRows[0] ?? this.versionConflict("A compra foi alterada por outra operação.");

    const location =
      input.location === undefined
        ? this.mapLocation(selected.location)
        : input.location === null
          ? await this.deleteLocation(updated.id)
          : this.mapLocation(await this.upsertLocation(updated.id, input.location));

    if (changedStatement) {
      await this.database
        .update(statementCycles)
        .set({ statementId: targetStatement.id })
        .where(eq(statementCycles.transactionId, selected.transaction.id));
      await this.updateStatementTotal(
        selected.statement,
        selected.statement.totalCents - selected.transaction.amountCents,
        selected.card,
      );
      await this.updateStatementTotal(
        targetStatement,
        targetStatement.totalCents + BigInt(input.amountCents),
        selected.card,
      );
    } else {
      await this.updateStatementTotal(
        selected.statement,
        selected.statement.totalCents -
          selected.transaction.amountCents +
          BigInt(input.amountCents),
        selected.card,
      );
    }

    const result = {
      id: updated.publicId,
      cardId: cardPublicId,
      statementId: targetStatement.publicId,
      categoryId: input.categoryId,
      amountCents: input.amountCents,
      description: input.description,
      occurredOn: input.occurredOn,
      competenceMonth: input.occurredOn.slice(0, 7),
      currency: updated.currency,
      status: "CONFIRMED" as const,
      location,
      version: updated.version,
    };
    await this.writeEvent(
      "CardPurchaseUpdated",
      targetStatement.publicId,
      targetStatement.version + 1,
      result,
    );
    await this.writePurchaseHistory(updated.id, result.id, result.version, "UPDATED", result);
    return result;
  }

  async deletePurchase(cardPublicId: string, purchasePublicId: string, expectedVersion: number) {
    const selected = await this.requireEditablePurchase(cardPublicId, purchasePublicId);
    if (selected.transaction.version !== expectedVersion)
      this.versionConflict(
        "A compra foi alterada por outra operação.",
        selected.transaction.version,
      );
    const deleted = await this.database
      .update(transactions)
      .set({
        deletedAt: new Date(),
        version: sql`${transactions.version} + 1`,
        updatedBy: this.context.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, selected.transaction.id),
          eq(transactions.version, expectedVersion),
        ),
      )
      .returning();
    const row = deleted[0] ?? this.versionConflict("A compra foi alterada por outra operação.");
    await this.database
      .delete(statementCycles)
      .where(eq(statementCycles.transactionId, selected.transaction.id));
    await this.updateStatementTotal(
      selected.statement,
      selected.statement.totalCents - selected.transaction.amountCents,
      selected.card,
    );
    await this.writeEvent(
      "CardPurchaseDeleted",
      selected.statement.publicId,
      selected.statement.version + 1,
      {
        id: purchasePublicId,
        statementId: selected.statement.publicId,
        version: row.version,
      },
    );
    await this.writePurchaseHistory(row.id, row.publicId, row.version, "DELETED", {
      id: purchasePublicId,
      statementId: selected.statement.publicId,
      amountCents: safeMoney(row.amountCents),
      occurredOn: row.occurredOn,
      version: row.version,
    });
  }

  async listStatements(
    cardPublicId: string,
    query: Parameters<ICardRepository["listStatements"]>[1],
  ) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({ statement: cardStatements })
      .from(cardStatements)
      .innerJoin(creditCards, eq(creditCards.id, cardStatements.cardId))
      .where(
        and(
          eq(cardStatements.workspaceId, this.context.workspaceId),
          eq(creditCards.publicId, cardPublicId),
          ...(cursor ? [lt(cardStatements.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(cardStatements.publicId))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map(({ statement }) => mapStatement(statement)),
      query.limit,
    );
  }

  async findStatement(statementId: string, query: Parameters<ICardRepository["findStatement"]>[1]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({ statement: cardStatements, cardId: creditCards.publicId })
      .from(cardStatements)
      .innerJoin(creditCards, eq(creditCards.id, cardStatements.cardId))
      .where(
        and(
          eq(cardStatements.workspaceId, this.context.workspaceId),
          eq(cardStatements.publicId, statementId),
        ),
      )
      .limit(1);
    const selected = rows[0] ?? this.statementNotFound();
    const purchaseRows = await this.database
      .select({
        transaction: transactions,
        categoryId: categories.publicId,
        location: transactionLocations,
      })
      .from(statementCycles)
      .innerJoin(transactions, eq(transactions.id, statementCycles.transactionId))
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(transactionLocations, eq(transactionLocations.transactionId, transactions.id))
      .where(
        and(
          eq(statementCycles.workspaceId, this.context.workspaceId),
          eq(statementCycles.statementId, selected.statement.id),
          eq(transactions.workspaceId, this.context.workspaceId),
          isNull(transactions.deletedAt),
          ...(cursor ? [lt(transactions.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(transactions.publicId))
      .limit(query.limit + 1);
    const purchases = createCursorPage(
      purchaseRows.map(({ transaction, categoryId, location }) => ({
        id: transaction.publicId,
        categoryId,
        description: transaction.description,
        amountCents: safeMoney(transaction.amountCents),
        currency: transaction.currency,
        occurredOn: transaction.occurredOn,
        location: this.mapLocation(location),
        editable:
          selected.statement.status === "OPEN" &&
          isManualCardPurchaseSource(
            transaction.sourceModule,
            transaction.sourcePublicId,
            selected.statement.publicId,
          ),
        version: transaction.version,
      })),
      query.limit,
    );
    return {
      ...mapStatement(selected.statement),
      cardId: selected.cardId,
      accountingMode: selected.statement.accountingMode,
      purchases: { items: [...purchases.items], pageInfo: purchases.pageInfo },
    };
  }

  async closeStatement(statementId: string, expectedVersion: number) {
    const rows = await this.database
      .update(cardStatements)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        version: sql`${cardStatements.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cardStatements.workspaceId, this.context.workspaceId),
          eq(cardStatements.publicId, statementId),
          eq(cardStatements.version, expectedVersion),
          eq(cardStatements.status, "OPEN"),
        ),
      )
      .returning();
    const statement = rows[0] ?? this.versionConflict("A fatura não está aberta ou foi alterada.");
    await this.database
      .update(transactions)
      .set({
        status: "CONFIRMED",
        version: sql`${transactions.version} + 1`,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.status, "PLANNED"),
          isNull(transactions.deletedAt),
          sql`exists (
            select 1
            from ${statementCycles}
            where ${statementCycles.transactionId} = ${transactions.id}
              and ${statementCycles.statementId} = ${statement.id}
          )`,
        ),
      );
    const result = {
      id: statement.publicId,
      status: "CLOSED" as const,
      totalCents: safeMoney(statement.totalCents),
      version: statement.version,
    };
    await this.writeEvent("StatementClosed", statement.publicId, statement.version, result);
    return result;
  }

  async reopenStatement(statementId: string, expectedVersion: number) {
    const rows = await this.database
      .update(cardStatements)
      .set({
        status: "OPEN",
        closedAt: null,
        version: sql`${cardStatements.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cardStatements.workspaceId, this.context.workspaceId),
          eq(cardStatements.publicId, statementId),
          eq(cardStatements.version, expectedVersion),
          eq(cardStatements.status, "CLOSED"),
          eq(cardStatements.paidCents, 0n),
        ),
      )
      .returning();
    const statement =
      rows[0] ??
      this.versionConflict(
        "A fatura não pode ser reaberta porque foi alterada, está paga ou já está aberta.",
      );
    const result = {
      id: statement.publicId,
      status: "OPEN" as const,
      totalCents: safeMoney(statement.totalCents),
      version: statement.version,
    };
    await this.writeEvent("StatementReopened", statement.publicId, statement.version, result);
    return result;
  }

  async payStatement(
    statementId: string,
    ids: Readonly<{ payment: string; transaction: string }>,
    input: Parameters<ICardRepository["payStatement"]>[2],
  ) {
    const rows = await this.database
      .select({
        statement: cardStatements,
        currency: creditCards.currency,
        cardName: creditCards.name,
        paymentAccountId: creditCards.paymentAccountId,
      })
      .from(cardStatements)
      .innerJoin(creditCards, eq(creditCards.id, cardStatements.cardId))
      .where(
        and(
          eq(cardStatements.workspaceId, this.context.workspaceId),
          eq(cardStatements.publicId, statementId),
          inArray(cardStatements.status, ["CLOSED", "PARTIALLY_PAID"]),
        ),
      )
      .limit(1)
      .for("update");
    const selected = rows[0];
    if (!selected)
      throw new ApplicationError("Fatura não está disponível para pagamento.", {
        category: "conflict",
        code: "STATEMENT_NOT_PAYABLE",
      });
    if (selected.statement.version !== input.expectedVersion)
      this.versionConflict("A fatura foi alterada por outra operação.", selected.statement.version);
    const remaining = safeMoney(selected.statement.totalCents - selected.statement.paidCents);
    if (input.amountCents > remaining)
      throw new ApplicationError("O pagamento excede o saldo da fatura.", {
        category: "validation",
        code: "STATEMENT_PAYMENT_EXCEEDS_BALANCE",
      });
    const account = (
      await this.database
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, this.context.workspaceId),
            eq(accounts.publicId, input.accountId),
            eq(accounts.currency, selected.currency),
            eq(accounts.active, true),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!account)
      throw new ApplicationError("Conta de pagamento inválida.", {
        category: "validation",
        code: "STATEMENT_PAYMENT_ACCOUNT_INVALID",
      });
    const created = await this.database
      .insert(transactions)
      .values({
        publicId: ids.transaction,
        workspaceId: this.context.workspaceId,
        accountId: account.id,
        type: selected.statement.accountingMode === "DETAILED" ? "CARD_PAYMENT" : "EXPENSE",
        status: "SETTLED",
        amountCents: BigInt(input.amountCents),
        currency: selected.currency,
        description: "Pagamento de fatura",
        occurredOn: input.paidOn,
        competenceMonth: input.paidOn.slice(0, 7),
        settledOn: input.paidOn,
        sourceModule: transactionSource.cardPayment,
        sourcePublicId: ids.payment,
        sourceSequence: 1,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning({ id: transactions.id });
    const transaction = created[0];
    if (!transaction) throw new Error("Statement payment transaction did not return an id.");
    await this.database.insert(statementPayments).values({
      publicId: ids.payment,
      workspaceId: this.context.workspaceId,
      statementId: selected.statement.id,
      transactionId: transaction.id,
      amountCents: BigInt(input.amountCents),
      paidOn: input.paidOn,
    });
    const paidCents = safeMoney(selected.statement.paidCents) + input.amountCents;
    const status =
      paidCents === safeMoney(selected.statement.totalCents)
        ? ("PAID" as const)
        : ("PARTIALLY_PAID" as const);
    const version = selected.statement.version + 1;
    await this.database
      .update(cardStatements)
      .set({ paidCents: BigInt(paidCents), status, version, updatedAt: new Date() })
      .where(eq(cardStatements.id, selected.statement.id));
    if (selected.paymentAccountId)
      await this.projection.sync({
        statementId,
        accountId: selected.paymentAccountId,
        cardName: selected.cardName,
        currency: selected.currency,
        dueOn: selected.statement.dueOn,
        totalCents: selected.statement.totalCents,
        paidCents: BigInt(paidCents),
      });
    const result = {
      id: ids.payment,
      statementId,
      transactionId: ids.transaction,
      amountCents: input.amountCents,
      paidCents,
      status,
      version,
    };
    await this.writeEvent("StatementPaid", statementId, version, {
      id: statementId,
      paymentId: ids.payment,
      amountCents: input.amountCents,
      status,
      version,
    });
    return result;
  }

  private statementNotFound(): never {
    throw new ApplicationError("Fatura não encontrada.", {
      category: "not-found",
      code: "STATEMENT_NOT_FOUND",
    });
  }
  private async requireWorkspaceCurrency(currency: string): Promise<void> {
    const workspace = (
      await this.database
        .select({ baseCurrency: workspaces.baseCurrency })
        .from(workspaces)
        .where(eq(workspaces.id, this.context.workspaceId))
        .limit(1)
    )[0];
    if (workspace?.baseCurrency === currency) return;
    throw new ApplicationError("A moeda do cartão deve ser a moeda-base do workspace.", {
      category: "validation",
      code: "CARD_CURRENCY_NOT_BASE",
      details: workspace ? { baseCurrency: workspace.baseCurrency } : undefined,
    });
  }
  private async requireEditablePurchase(cardPublicId: string, purchasePublicId: string) {
    const selected = (
      await this.database
        .select({
          transaction: transactions,
          statement: cardStatements,
          card: creditCards,
          location: transactionLocations,
        })
        .from(transactions)
        .innerJoin(statementCycles, eq(statementCycles.transactionId, transactions.id))
        .innerJoin(cardStatements, eq(cardStatements.id, statementCycles.statementId))
        .innerJoin(creditCards, eq(creditCards.id, cardStatements.cardId))
        .leftJoin(transactionLocations, eq(transactionLocations.transactionId, transactions.id))
        .where(
          and(
            eq(transactions.workspaceId, this.context.workspaceId),
            eq(transactions.publicId, purchasePublicId),
            eq(creditCards.publicId, cardPublicId),
            isNull(transactions.deletedAt),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!selected)
      throw new ApplicationError("Compra não encontrada.", {
        category: "not-found",
        code: "CARD_PURCHASE_NOT_FOUND",
      });
    const manualPurchase = isManualCardPurchaseSource(
      selected.transaction.sourceModule,
      selected.transaction.sourcePublicId,
      selected.statement.publicId,
    );
    if (!manualPurchase)
      throw new ApplicationError(
        "Edite esta compra pela recorrência ou pelo parcelamento de origem.",
        {
          category: "conflict",
          code: "CARD_PURCHASE_MANAGED_BY_SOURCE",
        },
      );
    if (selected.statement.status !== "OPEN")
      throw new ApplicationError("Compras de fatura fechada não podem ser alteradas diretamente.", {
        category: "conflict",
        code: "STATEMENT_IMMUTABLE",
      });
    return selected;
  }
  private mapLocation(location: typeof transactionLocations.$inferSelect | null | undefined) {
    return location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters: location.accuracyMeters,
          capturedAt: location.capturedAt.toISOString(),
          source: location.source,
        }
      : null;
  }
  private async upsertLocation(
    transactionId: bigint,
    location: NonNullable<Parameters<ICardRepository["createPurchase"]>[2]["location"]>,
  ) {
    const rows = await this.database
      .insert(transactionLocations)
      .values({
        workspaceId: this.context.workspaceId,
        transactionId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
        capturedAt: new Date(location.capturedAt),
        source: location.source,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .onConflictDoUpdate({
        target: transactionLocations.transactionId,
        set: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters: location.accuracyMeters,
          capturedAt: new Date(location.capturedAt),
          source: location.source,
          updatedBy: this.context.userId,
          updatedAt: new Date(),
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Card purchase location upsert did not return a row.");
    return row;
  }
  private async deleteLocation(transactionId: bigint): Promise<null> {
    await this.database
      .delete(transactionLocations)
      .where(
        and(
          eq(transactionLocations.workspaceId, this.context.workspaceId),
          eq(transactionLocations.transactionId, transactionId),
        ),
      );
    return null;
  }
  private async nextPurchaseSequence(statementPublicId: string): Promise<number> {
    const row = (
      await this.database
        .select({ value: sql<string>`coalesce(max(${transactions.sourceSequence}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, this.context.workspaceId),
            inArray(transactions.sourceModule, [
              transactionSource.cardPurchase,
              legacyCardSources.purchaseOrInstallmentOrPayment,
            ]),
            eq(transactions.sourcePublicId, statementPublicId),
          ),
        )
    )[0];
    return Number(row?.value ?? 0) + 1;
  }
  private async updateStatementTotal(
    statement: typeof cardStatements.$inferSelect,
    totalCents: bigint,
    card: typeof creditCards.$inferSelect,
  ) {
    if (totalCents < 0n) throw new Error("Statement total cannot be negative.");
    await this.database
      .update(cardStatements)
      .set({
        totalCents,
        version: sql`${cardStatements.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(cardStatements.id, statement.id));
    if (card.paymentAccountId)
      await this.projection.sync({
        statementId: statement.publicId,
        accountId: card.paymentAccountId,
        cardName: card.name,
        currency: card.currency,
        dueOn: statement.dueOn,
        totalCents,
        paidCents: statement.paidCents,
      });
  }
  private async writePurchaseHistory(
    transactionId: bigint,
    transactionPublicId: string,
    version: number,
    action: string,
    snapshot: unknown,
  ) {
    await this.database.insert(transactionHistory).values({
      workspaceId: this.context.workspaceId,
      transactionId,
      transactionPublicId,
      version,
      action,
      actorId: this.context.userId,
      snapshot,
    });
  }
  private versionConflict(message: string, currentVersion?: number): never {
    throw new ApplicationError(message, {
      category: "conflict",
      code: "VERSION_CONFLICT",
      ...(currentVersion === undefined ? {} : { details: { currentVersion } }),
    });
  }
  private async writeEvent(name: string, aggregateId: string, version: number, payload: unknown) {
    const eventPayload =
      payload && typeof payload === "object" && "location" in payload
        ? Object.fromEntries([
            ...Object.entries(payload).filter(([key]) => key !== "location"),
            ["hasLocation", (payload as { location?: unknown }).location !== null],
          ])
        : payload;
    await this.database.insert(outboxEvents).values({
      eventId: this.generateId(),
      workspaceId: this.context.workspaceId,
      eventName: name,
      eventVersion: 1,
      aggregateType: "statement",
      aggregatePublicId: aggregateId,
      aggregateVersion: version,
      correlationId: this.generateId(),
      payload: eventPayload,
      occurredAt: new Date(),
    });
  }
}
