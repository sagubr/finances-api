import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  IPrivacyExportJobRepository,
  PrivacyExportRecord,
} from "#/modules/operations/application/ports/privacy-export-job.repository.js";
import {
  consents,
  dataExportRequests,
  dataSubjectRequests,
  goals,
  plannerActivities,
  wishlistItems,
} from "#/modules/operations/infrastructure/database/operations.schema.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { assets } from "#/modules/wealth/infrastructure/database/wealth.schema.js";
import { and, eq } from "drizzle-orm";

export class PrivacyExportJobRepository implements IPrivacyExportJobRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
  ) {}

  async claim(publicId: string): Promise<PrivacyExportRecord | null> {
    return (
      (
        await this.database
          .select({
            id: dataExportRequests.id,
            subjectRequestId: dataExportRequests.subjectRequestId,
          })
          .from(dataExportRequests)
          .where(
            and(
              eq(dataExportRequests.workspaceId, this.workspaceId),
              eq(dataExportRequests.publicId, publicId),
            ),
          )
          .limit(1)
          .for("update")
      )[0] ?? null
    );
  }

  async collectSnapshot(): Promise<Readonly<Record<string, unknown>>> {
    const [
      workspace,
      accountRows,
      categoryRows,
      transactionRows,
      goalRows,
      assetRows,
      planner,
      wishlist,
      consentRows,
    ] = await Promise.all([
      this.database
        .select({
          id: workspaces.publicId,
          name: workspaces.name,
          timezone: workspaces.timezone,
          baseCurrency: workspaces.baseCurrency,
          createdAt: workspaces.createdAt,
        })
        .from(workspaces)
        .where(eq(workspaces.id, this.workspaceId))
        .limit(1),
      this.database
        .select({
          id: accounts.publicId,
          name: accounts.name,
          type: accounts.type,
          currency: accounts.currency,
          openingBalanceCents: accounts.openingBalanceCents,
          openingBalanceOn: accounts.openingBalanceOn,
          active: accounts.active,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: categories.publicId,
          name: categories.name,
          type: categories.type,
          color: categories.color,
          active: categories.active,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .where(eq(categories.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: transactions.publicId,
          type: transactions.type,
          status: transactions.status,
          amountCents: transactions.amountCents,
          currency: transactions.currency,
          description: transactions.description,
          occurredOn: transactions.occurredOn,
          competenceMonth: transactions.competenceMonth,
          settledOn: transactions.settledOn,
          deletedAt: transactions.deletedAt,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(eq(transactions.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: goals.publicId,
          name: goals.name,
          type: goals.type,
          status: goals.status,
          targetValue: goals.targetValue,
          unit: goals.unit,
          startsOn: goals.startsOn,
          dueOn: goals.dueOn,
          completedAt: goals.completedAt,
          createdAt: goals.createdAt,
        })
        .from(goals)
        .where(eq(goals.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: assets.publicId,
          name: assets.name,
          status: assets.status,
          acquiredOn: assets.acquiredOn,
          acquisitionCostCents: assets.acquisitionCostCents,
          currency: assets.currency,
          valuationMethod: assets.valuationMethod,
          createdAt: assets.createdAt,
        })
        .from(assets)
        .where(eq(assets.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: plannerActivities.publicId,
          name: plannerActivities.name,
          color: plannerActivities.color,
          archivedAt: plannerActivities.archivedAt,
          createdAt: plannerActivities.createdAt,
        })
        .from(plannerActivities)
        .where(eq(plannerActivities.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: wishlistItems.publicId,
          name: wishlistItems.name,
          url: wishlistItems.url,
          estimatedPriceCents: wishlistItems.estimatedPriceCents,
          currency: wishlistItems.currency,
          priority: wishlistItems.priority,
          reason: wishlistItems.reason,
          plannedOn: wishlistItems.plannedOn,
          status: wishlistItems.status,
          createdAt: wishlistItems.createdAt,
        })
        .from(wishlistItems)
        .where(eq(wishlistItems.workspaceId, this.workspaceId)),
      this.database
        .select({
          id: consents.publicId,
          purpose: consents.purpose,
          consentedAt: consents.consentedAt,
          withdrawnAt: consents.withdrawnAt,
        })
        .from(consents)
        .where(eq(consents.workspaceId, this.workspaceId)),
    ]);
    return {
      workspace: workspace[0] ?? null,
      accounts: accountRows,
      categories: categoryRows,
      transactions: transactionRows,
      goals: goalRows,
      assets: assetRows,
      plannerActivities: planner,
      wishlist,
      consents: consentRows,
    };
  }

  async markReady(
    item: PrivacyExportRecord,
    artifact: Readonly<{ storageKey: string; expiresAt: Date }>,
  ) {
    await this.database
      .update(dataExportRequests)
      .set({ storageKey: artifact.storageKey, expiresAt: artifact.expiresAt })
      .where(eq(dataExportRequests.id, item.id));
    await this.database
      .update(dataSubjectRequests)
      .set({ status: "READY" })
      .where(eq(dataSubjectRequests.id, item.subjectRequestId));
  }
}
