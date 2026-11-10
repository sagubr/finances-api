import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IInstallmentRepository } from "#/modules/planning/application/ports/installment.repository.js";
import { splitInstallments } from "#/modules/planning/domain/installments.js";
import { addCalendarMonths } from "#/modules/planning/domain/recurrence.js";
import {
  cardStatements,
  creditCards,
  installmentPlans,
  statementCycles,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import {
  cardInstallmentSources,
  transactionSource,
} from "#/modules/transactions/public/transaction-source.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { CardStatementProjectionWriter } from "./card-statement-projection.writer.js";
import { materializeOpenCardStatement } from "./open-card-statement.js";

const safeMoney = (value: bigint): number => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount))
    throw new Error("Persisted monetary value exceeds safe range.");
  return amount;
};

export class InstallmentRepository implements IInstallmentRepository {
  private readonly projection: CardStatementProjectionWriter;

  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
    private readonly generateId: () => string,
  ) {
    this.projection = new CardStatementProjectionWriter(database, context, generateId);
  }
  async list(query: Parameters<IInstallmentRepository["list"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        plan: installmentPlans,
        accountId: accounts.publicId,
        categoryId: categories.publicId,
        creditCardId: creditCards.publicId,
        creditCardName: creditCards.name,
      })
      .from(installmentPlans)
      .innerJoin(
        transactions,
        and(
          eq(transactions.workspaceId, installmentPlans.workspaceId),
          inArray(transactions.sourceModule, [
            transactionSource.recurring,
            ...cardInstallmentSources,
          ]),
          eq(transactions.sourcePublicId, installmentPlans.publicId),
          eq(transactions.sourceSequence, 1),
          isNull(transactions.deletedAt),
        ),
      )
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(creditCards, eq(creditCards.id, installmentPlans.creditCardId))
      .where(
        and(
          eq(installmentPlans.workspaceId, this.context.workspaceId),
          ...(cursor ? [lt(installmentPlans.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(installmentPlans.publicId))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map(({ plan, accountId, categoryId, creditCardId, creditCardName }) => ({
        id: plan.publicId,
        accountId,
        creditCardId,
        creditCardName,
        categoryId,
        description: plan.description,
        totalAmountCents: safeMoney(plan.totalAmountCents),
        installments: plan.installments,
        firstDueOn: plan.firstDueOn,
        currency: plan.currency,
        version: plan.version,
      })),
      query.limit,
    );
  }
  async create(
    planId: string,
    transactionIds: readonly string[],
    statementIds: readonly string[],
    input: Parameters<IInstallmentRepository["create"]>[3],
  ) {
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
              eq(categories.type, "EXPENSE"),
              eq(categories.active, true),
            ),
          )
          .limit(1)
      : [];
    const account = accountRows[0];
    const category = categoryRows[0];
    if (!account || (input.categoryId && !category))
      throw new ApplicationError("Conta ou categoria incompatível.", {
        category: "validation",
        code: "INSTALLMENT_RELATION_INVALID",
      });
    const creditCard = input.creditCardId
      ? (
          await this.database
            .select()
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
        )[0]
      : null;
    if (input.creditCardId && (!creditCard || !category))
      throw new ApplicationError("Cartão, conta de pagamento ou categoria incompatível.", {
        category: "validation",
        code: "INSTALLMENT_CARD_RELATION_INVALID",
      });
    await this.database.insert(installmentPlans).values({
      publicId: planId,
      workspaceId: this.context.workspaceId,
      creditCardId: creditCard?.id,
      description: input.description,
      totalAmountCents: BigInt(input.totalAmountCents),
      installments: input.installments,
      firstDueOn: input.firstDueOn,
      currency: input.currency,
    });
    const amounts = splitInstallments(BigInt(input.totalAmountCents), input.installments);
    if (transactionIds.length !== amounts.length)
      throw new Error("A transaction id is required for each installment.");
    if (statementIds.length !== amounts.length)
      throw new Error("A statement id is required for each installment.");
    const preferredDay = Number(input.firstDueOn.slice(8, 10));
    const items = amounts.map((amount, index) => {
      const transactionId = transactionIds[index];
      if (!transactionId) throw new Error("Missing transaction id for installment.");
      return {
        number: index + 1,
        amountCents: Number(amount),
        dueOn: addCalendarMonths(input.firstDueOn, index, preferredDay),
        transactionId,
      };
    });
    const createdTransactions = await this.database
      .insert(transactions)
      .values(
        items.map((item) => ({
          publicId: item.transactionId,
          workspaceId: this.context.workspaceId,
          accountId: account.id,
          categoryId: category?.id,
          type:
            creditCard?.accountingMode === "PAYMENT_ONLY"
              ? ("CARD_PAYMENT" as const)
              : ("EXPENSE" as const),
          status: creditCard ? ("CONFIRMED" as const) : ("PLANNED" as const),
          amountCents: BigInt(item.amountCents),
          currency: input.currency,
          description: `${input.description} (${item.number}/${input.installments})`,
          occurredOn: item.dueOn,
          competenceMonth: item.dueOn.slice(0, 7),
          sourceModule: creditCard
            ? transactionSource.cardInstallment
            : transactionSource.recurring,
          sourcePublicId: planId,
          sourceSequence: item.number,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })),
      )
      .returning({ id: transactions.id, publicId: transactions.publicId });
    if (creditCard) {
      for (const [index, item] of items.entries()) {
        const transaction = createdTransactions[index];
        const statementPublicId = statementIds[index];
        if (!transaction) throw new Error("Card installment transaction was not returned.");
        if (!statementPublicId) throw new Error("Card installment statement id is missing.");
        let firstStatementId = true;
        const statement = await materializeOpenCardStatement(this.database, {
          workspaceId: this.context.workspaceId,
          card: creditCard,
          occurredOn: item.dueOn,
          generateId: () => {
            if (firstStatementId) {
              firstStatementId = false;
              return statementPublicId;
            }
            return this.generateId();
          },
        });
        await this.database.insert(statementCycles).values({
          workspaceId: this.context.workspaceId,
          statementId: statement.id,
          transactionId: transaction.id,
        });
        const updatedStatement = (
          await this.database
            .update(cardStatements)
            .set({
              totalCents: sql`${cardStatements.totalCents} + ${item.amountCents}`,
              updatedAt: new Date(),
            })
            .where(eq(cardStatements.id, statement.id))
            .returning({ totalCents: cardStatements.totalCents })
        )[0];
        if (!updatedStatement) throw new Error("Card installment statement total was not updated.");
        await this.projection.sync({
          statementId: statement.publicId,
          accountId: account.id,
          cardName: creditCard.name,
          currency: creditCard.currency,
          dueOn: statement.dueOn,
          totalCents: updatedStatement.totalCents,
          paidCents: statement.paidCents,
        });
      }
    }
    return { id: planId, totalAmountCents: input.totalAmountCents, installments: items };
  }

  async update(planId: string, input: Parameters<IInstallmentRepository["update"]>[1]) {
    const relations = await this.resolveRelations(
      input.accountId,
      input.categoryId,
      input.currency,
    );
    const plan = (
      await this.database
        .select()
        .from(installmentPlans)
        .where(
          and(
            eq(installmentPlans.workspaceId, this.context.workspaceId),
            eq(installmentPlans.publicId, planId),
            eq(installmentPlans.version, input.expectedVersion),
          ),
        )
        .limit(1)
    )[0];
    if (!plan) this.versionConflict();
    if (plan.creditCardId)
      throw new ApplicationError(
        "Parcelamentos do cartão devem ser ajustados pelas compras das faturas.",
        {
          category: "conflict",
          code: "CARD_INSTALLMENT_IMMUTABLE",
        },
      );
    const generated = await this.database
      .select({
        id: transactions.id,
        status: transactions.status,
        sequence: transactions.sourceSequence,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.sourceModule, transactionSource.recurring),
          eq(transactions.sourcePublicId, planId),
          isNull(transactions.deletedAt),
        ),
      )
      .orderBy(asc(transactions.sourceSequence));
    if (
      generated.length !== plan.installments ||
      generated.some(({ status }) => status !== "PLANNED")
    )
      throw new ApplicationError("Parcelamentos com parcelas confirmadas não podem ser editados.", {
        category: "conflict",
        code: "INSTALLMENT_IMMUTABLE",
      });
    const amounts = splitInstallments(BigInt(input.totalAmountCents), plan.installments);
    const preferredDay = Number(input.firstDueOn.slice(8, 10));
    for (const [index, transaction] of generated.entries()) {
      const amount = amounts[index];
      if (amount === undefined) throw new Error("Installment amount is missing.");
      const dueOn = addCalendarMonths(input.firstDueOn, index, preferredDay);
      await this.database
        .update(transactions)
        .set({
          accountId: relations.accountId,
          categoryId: relations.categoryId,
          amountCents: amount,
          currency: input.currency,
          description: `${input.description} (${index + 1}/${plan.installments})`,
          occurredOn: dueOn,
          competenceMonth: dueOn.slice(0, 7),
          version: sql`${transactions.version} + 1`,
          updatedAt: new Date(),
          updatedBy: this.context.userId,
        })
        .where(eq(transactions.id, transaction.id));
    }
    const rows = await this.database
      .update(installmentPlans)
      .set({
        description: input.description,
        totalAmountCents: BigInt(input.totalAmountCents),
        firstDueOn: input.firstDueOn,
        currency: input.currency,
        version: sql`${installmentPlans.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(installmentPlans.id, plan.id))
      .returning({ version: installmentPlans.version });
    return {
      id: planId,
      accountId: input.accountId,
      creditCardId: null,
      creditCardName: null,
      categoryId: input.categoryId ?? null,
      description: input.description,
      totalAmountCents: input.totalAmountCents,
      installments: plan.installments,
      firstDueOn: input.firstDueOn,
      currency: input.currency,
      version: rows[0]?.version ?? plan.version + 1,
    };
  }

  async delete(planId: string, expectedVersion: number) {
    const plan = (
      await this.database
        .select({ id: installmentPlans.id, creditCardId: installmentPlans.creditCardId })
        .from(installmentPlans)
        .where(
          and(
            eq(installmentPlans.workspaceId, this.context.workspaceId),
            eq(installmentPlans.publicId, planId),
            eq(installmentPlans.version, expectedVersion),
          ),
        )
        .limit(1)
    )[0];
    if (!plan) this.versionConflict();
    if (plan.creditCardId)
      throw new ApplicationError(
        "Parcelamentos do cartão devem ser ajustados pelas compras das faturas.",
        {
          category: "conflict",
          code: "CARD_INSTALLMENT_IMMUTABLE",
        },
      );
    const generated = await this.database
      .select({ id: transactions.id, status: transactions.status })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.sourceModule, transactionSource.recurring),
          eq(transactions.sourcePublicId, planId),
          isNull(transactions.deletedAt),
        ),
      );
    if (generated.some(({ status }) => status !== "PLANNED"))
      throw new ApplicationError(
        "Parcelamentos com parcelas confirmadas não podem ser excluídos.",
        {
          category: "conflict",
          code: "INSTALLMENT_IMMUTABLE",
        },
      );
    await this.database
      .update(transactions)
      .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: this.context.userId })
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.sourceModule, transactionSource.recurring),
          eq(transactions.sourcePublicId, planId),
          isNull(transactions.deletedAt),
        ),
      );
    await this.database.delete(installmentPlans).where(eq(installmentPlans.id, plan.id));
  }

  private async resolveRelations(
    accountId: string,
    categoryId: string | undefined,
    currency: string,
  ) {
    const account = (
      await this.database
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, this.context.workspaceId),
            eq(accounts.publicId, accountId),
            eq(accounts.currency, currency),
            eq(accounts.active, true),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    const category = categoryId
      ? (
          await this.database
            .select({ id: categories.id })
            .from(categories)
            .where(
              and(
                eq(categories.workspaceId, this.context.workspaceId),
                eq(categories.publicId, categoryId),
                eq(categories.type, "EXPENSE"),
                eq(categories.active, true),
              ),
            )
            .limit(1)
        )[0]
      : null;
    if (!account || (categoryId && !category))
      throw new ApplicationError("Conta ou categoria incompatível.", {
        category: "validation",
        code: "INSTALLMENT_RELATION_INVALID",
      });
    return { accountId: account.id, categoryId: category?.id ?? null };
  }

  private versionConflict(): never {
    throw new ApplicationError("Parcelamento não encontrado ou desatualizado.", {
      category: "conflict",
      code: "VERSION_CONFLICT",
    });
  }
}
