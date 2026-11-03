import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import {
  budgets,
  creditCards,
  recurringRules,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import type { IStructureDependencyRepository } from "#/modules/transactions/application/ports/structure-dependency.repository.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { and, eq, inArray, isNull } from "drizzle-orm";

export class StructureDependencyRepository implements IStructureDependencyRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
  ) {}

  async hasAccountDependencies(publicId: string): Promise<boolean> {
    const account = (
      await this.database
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.workspaceId, this.workspaceId), eq(accounts.publicId, publicId)))
        .limit(1)
    )[0];
    if (!account) return false;
    const [pendingTransaction, activeCard, recurringRule] = await Promise.all([
      this.database
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, this.workspaceId),
            eq(transactions.accountId, account.id),
            inArray(transactions.status, ["PLANNED", "CONFIRMED"]),
            isNull(transactions.deletedAt),
          ),
        )
        .limit(1),
      this.database
        .select({ id: creditCards.id })
        .from(creditCards)
        .where(
          and(
            eq(creditCards.workspaceId, this.workspaceId),
            eq(creditCards.paymentAccountId, account.id),
            eq(creditCards.active, true),
          ),
        )
        .limit(1),
      this.database
        .select({ id: recurringRules.id })
        .from(recurringRules)
        .where(
          and(
            eq(recurringRules.workspaceId, this.workspaceId),
            eq(recurringRules.accountId, account.id),
            isNull(recurringRules.deletedAt),
          ),
        )
        .limit(1),
    ]);
    return Boolean(pendingTransaction[0] || activeCard[0] || recurringRule[0]);
  }

  async hasCategoryDependencies(publicId: string): Promise<boolean> {
    const category = (
      await this.database
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.workspaceId, this.workspaceId), eq(categories.publicId, publicId)))
        .limit(1)
    )[0];
    if (!category) return false;
    const [budget, recurringRule] = await Promise.all([
      this.database
        .select({ id: budgets.id })
        .from(budgets)
        .where(
          and(
            eq(budgets.workspaceId, this.workspaceId),
            eq(budgets.categoryId, category.id),
            isNull(budgets.deletedAt),
          ),
        )
        .limit(1),
      this.database
        .select({ id: recurringRules.id })
        .from(recurringRules)
        .where(
          and(
            eq(recurringRules.workspaceId, this.workspaceId),
            eq(recurringRules.categoryId, category.id),
            isNull(recurringRules.deletedAt),
          ),
        )
        .limit(1),
    ]);
    return Boolean(budget[0] || recurringRule[0]);
  }
}
