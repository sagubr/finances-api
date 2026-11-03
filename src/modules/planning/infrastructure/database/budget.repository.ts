import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IBudgetRepository } from "#/modules/planning/application/ports/budget.repository.js";
import { reachedBudgetThresholds } from "#/modules/planning/domain/budget-thresholds.js";
import type { BudgetView } from "#/modules/planning/dtos/planning.dto.js";
import { budgets } from "#/modules/planning/infrastructure/database/planning.schema.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { categorizedConsumptionTypes } from "#/modules/transactions/public/transaction-source.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";

type BudgetRow = typeof budgets.$inferSelect;
type JoinedBudget = Readonly<{
  budget: BudgetRow;
  categoryId: string;
  categoryName: string;
}>;
const safeMoney = (value: bigint): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error("Persisted monetary value exceeds safe range.");
  return number;
};
const mapBudget = ({ budget, categoryId, categoryName }: JoinedBudget): BudgetView => ({
  id: budget.publicId,
  month: budget.month,
  categoryId,
  categoryName,
  limitCents: safeMoney(budget.limitCents),
  currency: budget.currency,
  version: budget.version,
});

export class BudgetRepository implements IBudgetRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
  ) {}
  async list(query: Parameters<IBudgetRepository["list"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.baseQuery()
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          isNull(budgets.deletedAt),
          ...(query.month ? [eq(budgets.month, query.month)] : []),
          ...(cursor ? [lt(budgets.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(budgets.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapBudget), query.limit);
  }
  async create(publicId: string, input: Parameters<IBudgetRepository["create"]>[1]) {
    const workspace = (
      await this.database
        .select({ baseCurrency: workspaces.baseCurrency })
        .from(workspaces)
        .where(eq(workspaces.id, this.context.workspaceId))
        .limit(1)
    )[0];
    if (!workspace || workspace.baseCurrency !== input.currency)
      throw new ApplicationError("A moeda do orçamento deve ser a moeda-base do workspace.", {
        category: "validation",
        code: "BUDGET_CURRENCY_NOT_BASE",
        details: workspace ? { baseCurrency: workspace.baseCurrency } : undefined,
      });
    const category = (
      await this.database
        .select({ id: categories.id, name: categories.name })
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
      throw new ApplicationError("Alvo de orçamento inválido.", {
        category: "validation",
        code: "BUDGET_TARGET_INVALID",
      });
    const rows = await this.database
      .insert(budgets)
      .values({
        publicId,
        workspaceId: this.context.workspaceId,
        month: input.month,
        categoryId: category.id,
        limitCents: BigInt(input.limitCents),
        currency: input.currency,
      })
      .returning();
    const budget = rows[0];
    if (!budget) throw new Error("Budget insert did not return a row.");
    return mapBudget({
      budget,
      categoryId: input.categoryId,
      categoryName: category.name,
    });
  }
  async update(publicId: string, input: Parameters<IBudgetRepository["update"]>[1]) {
    const rows = await this.database
      .update(budgets)
      .set({
        limitCents: BigInt(input.limitCents),
        version: sql`${budgets.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          eq(budgets.publicId, publicId),
          eq(budgets.version, input.expectedVersion),
          isNull(budgets.deletedAt),
        ),
      )
      .returning({ id: budgets.id });
    if (!rows[0]) this.versionConflict();
    return this.requireBudget(publicId);
  }
  async delete(publicId: string, expectedVersion: number): Promise<void> {
    const rows = await this.database
      .update(budgets)
      .set({ deletedAt: new Date(), version: sql`${budgets.version} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          eq(budgets.publicId, publicId),
          eq(budgets.version, expectedVersion),
          isNull(budgets.deletedAt),
        ),
      )
      .returning({ id: budgets.id });
    if (!rows[0]) this.versionConflict();
  }
  async copy(input: Parameters<IBudgetRepository["copy"]>[0], generateId: () => string) {
    const destination = await this.database
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          eq(budgets.month, input.targetMonth),
          isNull(budgets.deletedAt),
        ),
      )
      .limit(1);
    if (destination[0])
      throw new ApplicationError("O mês de destino já possui orçamentos.", {
        category: "conflict",
        code: "BUDGET_DESTINATION_NOT_EMPTY",
      });
    const sources = await this.database
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          eq(budgets.month, input.sourceMonth),
          isNull(budgets.deletedAt),
        ),
      )
      .orderBy(budgets.id);
    if (sources.length > 0)
      await this.database.insert(budgets).values(
        sources.map((source) => ({
          publicId: generateId(),
          workspaceId: this.context.workspaceId,
          month: input.targetMonth,
          categoryId: source.categoryId,
          limitCents: source.limitCents,
          currency: source.currency,
        })),
      );
    return {
      sourceMonth: input.sourceMonth,
      targetMonth: input.targetMonth,
      copied: sources.length,
    };
  }
  async progress(query: Parameters<IBudgetRepository["progress"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const raw = await this.database
      .select({
        budget: budgets,
        categoryId: categories.publicId,
        categoryName: categories.name,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          eq(budgets.month, query.month),
          isNull(budgets.deletedAt),
          ...(cursor ? [lt(budgets.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(budgets.publicId))
      .limit(query.limit + 1);
    const result = [];
    for (const entry of raw.slice(0, query.limit)) {
      const view = mapBudget(entry);
      const target = [entry.budget.categoryId];
      const transactionRows =
        target.length === 0
          ? []
          : await this.database
              .select({ amount: transactions.amountCents, status: transactions.status })
              .from(transactions)
              .where(
                and(
                  eq(transactions.workspaceId, this.context.workspaceId),
                  eq(transactions.competenceMonth, query.month),
                  inArray(transactions.type, categorizedConsumptionTypes),
                  eq(transactions.currency, entry.budget.currency),
                  inArray(transactions.categoryId, target),
                  isNull(transactions.deletedAt),
                ),
              );
      const realized = transactionRows
        .filter((item) => item.status !== "PLANNED")
        .reduce((sum, item) => sum + item.amount, 0n);
      const planned = transactionRows
        .filter((item) => item.status === "PLANNED")
        .reduce((sum, item) => sum + item.amount, 0n);
      result.push({
        id: view.id,
        limitCents: view.limitCents,
        realizedCents: safeMoney(realized),
        plannedCents: safeMoney(planned),
        consumptionBps: reachedBudgetThresholds(realized, entry.budget.limitCents).consumptionBps,
        currency: view.currency,
      });
    }
    return {
      items: result,
      pageInfo: {
        hasNextPage: raw.length > query.limit,
        nextCursor:
          raw.length > query.limit && result.at(-1)
            ? Buffer.from(result.at(-1)?.id ?? "", "utf8").toString("base64url")
            : null,
      },
    };
  }
  private baseQuery() {
    return this.database
      .select({
        budget: budgets,
        categoryId: categories.publicId,
        categoryName: categories.name,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .$dynamic();
  }
  private async requireBudget(publicId: string) {
    const rows = await this.baseQuery()
      .where(
        and(
          eq(budgets.workspaceId, this.context.workspaceId),
          eq(budgets.publicId, publicId),
          isNull(budgets.deletedAt),
        ),
      )
      .limit(1);
    const row = rows[0] ?? this.versionConflict();
    return mapBudget(row);
  }
  private versionConflict(): never {
    throw new ApplicationError("O orçamento foi alterado por outra operação.", {
      category: "conflict",
      code: "VERSION_CONFLICT",
    });
  }
}
