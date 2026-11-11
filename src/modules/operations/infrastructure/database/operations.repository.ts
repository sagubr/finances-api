import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IOperationsRepository } from "#/modules/operations/application/ports/operations.repository.js";
import type {
  ActivityInput,
  ActivityPatch,
  ConsentInput,
  GoalCheckinInput,
  GoalInput,
  GoalPatch,
  SlotsInput,
  WishlistInput,
  WishlistPatch,
  WishlistPurchaseInput,
} from "#/modules/operations/dtos/operations.dto.js";
import { NotificationRepository } from "#/modules/operations/infrastructure/database/notification.repository.js";
import {
  accountDeletionRequests,
  consents,
  dataExportRequests,
  dataSubjectRequests,
  goalCheckins,
  goalProgressSnapshots,
  goals,
  goalSourceBindings,
  legalDocuments,
  plannerActivities,
  plannerSlots,
  plannerTemplates,
  plans,
  planVersions,
  sensitiveAccessLog,
  subscriptions,
  usageCounters,
  wishlistItems,
  wishlistPurchaseLinks,
} from "#/modules/operations/infrastructure/database/operations.schema.js";
import {
  mapActivity,
  mapGoal,
  mapOptionalMoney,
  mapWishlistItem,
} from "#/modules/operations/mappers/operations.mapper.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { jobRuns, workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  transactionHistory,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import {
  createCursorPage,
  decodeCompositeCursor,
  decodeCursor,
  encodeCompositeCursor,
} from "#/shared/pagination/cursor-pagination.js";
import { Decimal } from "decimal.js";
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, ne, sql } from "drizzle-orm";

export class OperationsRepository implements IOperationsRepository {
  private readonly notificationRepository: NotificationRepository;

  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
  ) {
    this.notificationRepository = new NotificationRepository(database, context);
  }

  async listActivities(query: Parameters<IOperationsRepository["listActivities"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        id: plannerActivities.publicId,
        name: plannerActivities.name,
        color: plannerActivities.color,
        archivedAt: plannerActivities.archivedAt,
        version: plannerActivities.version,
      })
      .from(plannerActivities)
      .where(
        and(
          eq(plannerActivities.workspaceId, this.context.workspaceId),
          isNull(plannerActivities.archivedAt),
          ...(cursor ? [lt(plannerActivities.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(plannerActivities.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapActivity), query.limit);
  }
  async createActivity(id: string, input: ActivityInput) {
    await this.database.insert(plannerActivities).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      name: input.name,
      color: input.color,
    });
    return { id, name: input.name, color: input.color ?? null, archivedAt: null, version: 1 };
  }
  async updateActivity(id: string, input: ActivityPatch) {
    const rows = await this.database
      .update(plannerActivities)
      .set({
        name: input.name,
        color: input.color ?? null,
        version: sql`${plannerActivities.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plannerActivities.workspaceId, this.context.workspaceId),
          eq(plannerActivities.publicId, id),
          eq(plannerActivities.version, input.expectedVersion),
          isNull(plannerActivities.archivedAt),
        ),
      )
      .returning({
        id: plannerActivities.publicId,
        name: plannerActivities.name,
        color: plannerActivities.color,
        archivedAt: plannerActivities.archivedAt,
        version: plannerActivities.version,
      });
    const activity = rows[0];
    if (!activity) this.resourceConflict("Atividade");
    return mapActivity(activity);
  }
  async archiveActivity(id: string, expectedVersion: number) {
    const rows = await this.database
      .update(plannerActivities)
      .set({
        archivedAt: new Date(),
        version: sql`${plannerActivities.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plannerActivities.workspaceId, this.context.workspaceId),
          eq(plannerActivities.publicId, id),
          eq(plannerActivities.version, expectedVersion),
          isNull(plannerActivities.archivedAt),
        ),
      )
      .returning({ id: plannerActivities.id });
    if (!rows[0]) this.resourceConflict("Atividade");
  }

  async saveTemplate(id: string, input: SlotsInput, generateId: () => string) {
    let templateInternalId: bigint;
    if (input.templateId) {
      const rows = await this.database
        .update(plannerTemplates)
        .set({
          name: input.name,
          version: sql`${plannerTemplates.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(plannerTemplates.workspaceId, this.context.workspaceId),
            eq(plannerTemplates.publicId, input.templateId),
            ...(input.expectedVersion ? [eq(plannerTemplates.version, input.expectedVersion)] : []),
          ),
        )
        .returning({ id: plannerTemplates.id });
      const template = rows[0];
      if (!template) this.templateConflict();
      templateInternalId = template.id;
      await this.database
        .delete(plannerSlots)
        .where(
          and(
            eq(plannerSlots.workspaceId, this.context.workspaceId),
            eq(plannerSlots.templateId, templateInternalId),
          ),
        );
    } else {
      const rows = await this.database
        .insert(plannerTemplates)
        .values({ publicId: id, workspaceId: this.context.workspaceId, name: input.name })
        .returning({ id: plannerTemplates.id });
      const template = rows[0];
      if (!template) throw new Error("Planner template insert did not return a row.");
      templateInternalId = template.id;
    }
    const activityIds = [...new Set(input.slots.map((slot) => slot.activityId))];
    const activityRows =
      activityIds.length === 0
        ? []
        : await this.database
            .select({ id: plannerActivities.id, publicId: plannerActivities.publicId })
            .from(plannerActivities)
            .where(
              and(
                eq(plannerActivities.workspaceId, this.context.workspaceId),
                inArray(plannerActivities.publicId, activityIds),
                isNull(plannerActivities.archivedAt),
              ),
            );
    const byPublicId = new Map(activityRows.map((activity) => [activity.publicId, activity.id]));
    if (byPublicId.size !== activityIds.length)
      throw new ApplicationError("Atividade inválida.", {
        category: "validation",
        code: "PLANNER_ACTIVITY_INVALID",
      });
    if (input.slots.length > 0)
      await this.database.insert(plannerSlots).values(
        input.slots.map((slot) => ({
          publicId: generateId(),
          workspaceId: this.context.workspaceId,
          templateId: templateInternalId,
          activityId: this.requireActivity(byPublicId, slot.activityId),
          weekday: slot.weekday,
          startMinute: slot.startMinute,
          durationMinutes: slot.durationMinutes,
        })),
      );
    return { id, name: input.name, slots: input.slots };
  }

  async getWeek(referenceDate: string) {
    const rows = await this.database
      .select({
        templateId: plannerTemplates.publicId,
        id: plannerSlots.publicId,
        activityId: plannerActivities.publicId,
        name: plannerActivities.name,
        color: plannerActivities.color,
        weekday: plannerSlots.weekday,
        startMinute: plannerSlots.startMinute,
        durationMinutes: plannerSlots.durationMinutes,
      })
      .from(plannerTemplates)
      .innerJoin(plannerSlots, eq(plannerSlots.templateId, plannerTemplates.id))
      .innerJoin(plannerActivities, eq(plannerActivities.id, plannerSlots.activityId))
      .where(
        and(
          eq(plannerTemplates.workspaceId, this.context.workspaceId),
          eq(plannerTemplates.active, true),
          isNull(plannerActivities.archivedAt),
        ),
      )
      .orderBy(asc(plannerSlots.weekday), asc(plannerSlots.startMinute));
    const workspace = (
      await this.database
        .select({ timezone: workspaces.timezone })
        .from(workspaces)
        .where(eq(workspaces.id, this.context.workspaceId))
        .limit(1)
    )[0];
    if (!workspace) throw new Error("Workspace context no longer exists.");
    return { referenceDate, timezone: workspace.timezone, slots: rows };
  }

  async listGoals(query: Parameters<IOperationsRepository["listGoals"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        id: goals.publicId,
        name: goals.name,
        type: goals.type,
        status: goals.status,
        targetValue: goals.targetValue,
        unit: goals.unit,
        startsOn: goals.startsOn,
        dueOn: goals.dueOn,
        version: goals.version,
        completedAt: goals.completedAt,
      })
      .from(goals)
      .where(
        and(
          eq(goals.workspaceId, this.context.workspaceId),
          ne(goals.status, "ARCHIVED"),
          ...(cursor ? [lt(goals.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(goals.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapGoal), query.limit);
  }
  async createGoal(id: string, input: GoalInput) {
    const rows = await this.database
      .insert(goals)
      .values({
        publicId: id,
        workspaceId: this.context.workspaceId,
        name: input.name,
        type: input.type,
        targetValue: input.targetValue,
        unit: input.unit,
        startsOn: input.startsOn,
        dueOn: input.dueOn,
      })
      .returning({ id: goals.id });
    const goal = rows[0];
    if (!goal) throw new Error("Goal insert did not return a row.");
    if (input.source)
      await this.database.insert(goalSourceBindings).values({
        workspaceId: this.context.workspaceId,
        goalId: goal.id,
        sourceModule: input.source.module,
        sourceType: input.source.type,
        sourcePublicId: input.source.id,
        config: input.source.config,
      });
    return {
      id,
      name: input.name,
      type: input.type,
      status: "ACTIVE" as const,
      targetValue: input.targetValue,
      unit: input.unit,
      startsOn: input.startsOn,
      dueOn: input.dueOn ?? null,
      version: 1,
      completedAt: null,
    };
  }
  async updateGoal(id: string, input: GoalPatch) {
    const rows = await this.database
      .update(goals)
      .set({
        name: input.name,
        type: input.type,
        targetValue: input.targetValue,
        unit: input.unit,
        startsOn: input.startsOn,
        dueOn: input.dueOn ?? null,
        version: sql`${goals.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.workspaceId, this.context.workspaceId),
          eq(goals.publicId, id),
          eq(goals.version, input.expectedVersion),
          ne(goals.status, "ARCHIVED"),
        ),
      )
      .returning({
        id: goals.publicId,
        name: goals.name,
        type: goals.type,
        status: goals.status,
        targetValue: goals.targetValue,
        unit: goals.unit,
        startsOn: goals.startsOn,
        dueOn: goals.dueOn,
        version: goals.version,
        completedAt: goals.completedAt,
      });
    const goal = rows[0];
    if (!goal) this.resourceConflict("Meta");
    return mapGoal(goal);
  }
  async archiveGoal(id: string, expectedVersion: number) {
    const rows = await this.database
      .update(goals)
      .set({
        status: "ARCHIVED",
        version: sql`${goals.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.workspaceId, this.context.workspaceId),
          eq(goals.publicId, id),
          eq(goals.version, expectedVersion),
          ne(goals.status, "ARCHIVED"),
        ),
      )
      .returning({ id: goals.id });
    if (!rows[0]) this.resourceConflict("Meta");
  }
  async createGoalCheckin(id: string, goalId: string, input: GoalCheckinInput) {
    const goal = (
      await this.database
        .select({ id: goals.id })
        .from(goals)
        .where(
          and(
            eq(goals.workspaceId, this.context.workspaceId),
            eq(goals.publicId, goalId),
            eq(goals.status, "ACTIVE"),
          ),
        )
        .limit(1)
    )[0];
    if (!goal)
      throw new ApplicationError("Meta ativa não encontrada.", {
        category: "not-found",
        code: "GOAL_NOT_FOUND",
      });
    await this.database.insert(goalCheckins).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      goalId: goal.id,
      value: input.value,
      checkedOn: input.checkedOn,
      note: input.note,
    });
    return { id, goalId, value: input.value, checkedOn: input.checkedOn, note: input.note ?? null };
  }
  async getGoalProgress(id: string, calculatedAt: string) {
    const goal = (
      await this.database
        .select({
          id: goals.id,
          type: goals.type,
          targetValue: goals.targetValue,
          status: goals.status,
        })
        .from(goals)
        .where(and(eq(goals.workspaceId, this.context.workspaceId), eq(goals.publicId, id)))
        .limit(1)
    )[0];
    if (!goal)
      throw new ApplicationError("Meta não encontrada.", {
        category: "not-found",
        code: "GOAL_NOT_FOUND",
      });
    const currentValue =
      goal.type === "MANUAL" || goal.type === "COUNT"
        ? ((
            await this.database
              .select({ value: sql<string>`coalesce(sum(${goalCheckins.value}), 0)::text` })
              .from(goalCheckins)
              .where(
                and(
                  eq(goalCheckins.workspaceId, this.context.workspaceId),
                  eq(goalCheckins.goalId, goal.id),
                ),
              )
          )[0]?.value ?? "0")
        : ((
            await this.database
              .select({ value: goalProgressSnapshots.currentValue })
              .from(goalProgressSnapshots)
              .where(
                and(
                  eq(goalProgressSnapshots.workspaceId, this.context.workspaceId),
                  eq(goalProgressSnapshots.goalId, goal.id),
                ),
              )
              .orderBy(desc(goalProgressSnapshots.calculatedAt))
              .limit(1)
          )[0]?.value ?? "0");
    const current = new Decimal(currentValue);
    const target = new Decimal(goal.targetValue);
    const rawProgressBps = current
      .times(10_000)
      .dividedBy(target)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    return {
      goalId: id,
      currentValue: current.toFixed(),
      targetValue: goal.targetValue,
      progressBps: Math.min(10_000, rawProgressBps),
      rawProgressBps,
      status: goal.status,
      calculatedAt,
    };
  }

  async listWishlist(query: Parameters<IOperationsRepository["listWishlist"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const monthStart = query.month ? `${query.month}-01` : undefined;
    const monthEnd = query.month
      ? new Date(Date.UTC(Number(query.month.slice(0, 4)), Number(query.month.slice(5, 7)), 1))
          .toISOString()
          .slice(0, 10)
      : undefined;
    const rows = await this.database
      .select({
        item: wishlistItems,
        transactionId: transactions.publicId,
      })
      .from(wishlistItems)
      .leftJoin(wishlistPurchaseLinks, eq(wishlistPurchaseLinks.itemId, wishlistItems.id))
      .leftJoin(transactions, eq(transactions.id, wishlistPurchaseLinks.transactionId))
      .where(
        and(
          eq(wishlistItems.workspaceId, this.context.workspaceId),
          ...(query.status
            ? [eq(wishlistItems.status, query.status)]
            : [ne(wishlistItems.status, "ARCHIVED")]),
          ...(query.priority !== undefined ? [eq(wishlistItems.priority, query.priority)] : []),
          ...(monthStart && monthEnd
            ? [
                sql`coalesce(${wishlistItems.purchasedOn}, ${wishlistItems.plannedOn}) >= ${monthStart}::date`,
                sql`coalesce(${wishlistItems.purchasedOn}, ${wishlistItems.plannedOn}) < ${monthEnd}::date`,
              ]
            : []),
          ...(query.from
            ? [
                sql`coalesce(${wishlistItems.purchasedOn}, ${wishlistItems.plannedOn}) >= ${query.from}::date`,
              ]
            : []),
          ...(query.to
            ? [
                sql`coalesce(${wishlistItems.purchasedOn}, ${wishlistItems.plannedOn}) <= ${query.to}::date`,
              ]
            : []),
          ...(cursor ? [lt(wishlistItems.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(wishlistItems.publicId))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map(({ item, transactionId }) => mapWishlistItem({ ...item, transactionId })),
      query.limit,
    );
  }
  async getWishlistSummary(month: string) {
    const monthStart = `${month}-01`;
    const monthEnd = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
      .toISOString()
      .slice(0, 10);
    const rows = await this.database
      .select({
        currency: wishlistItems.currency,
        totalCents: sql<bigint>`coalesce(sum(${wishlistItems.estimatedPriceCents}), 0)`,
        itemCount: sql<bigint>`count(*)`,
      })
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.workspaceId, this.context.workspaceId),
          inArray(wishlistItems.status, ["PLANNED", "PURCHASE_PENDING"]),
          sql`${wishlistItems.plannedOn} >= ${monthStart}::date`,
          sql`${wishlistItems.plannedOn} < ${monthEnd}::date`,
        ),
      )
      .groupBy(wishlistItems.currency)
      .orderBy(asc(wishlistItems.currency));
    return {
      month,
      totals: rows.map((row) => ({
        currency: row.currency,
        totalCents: Number(row.totalCents),
        itemCount: Number(row.itemCount),
      })),
    };
  }
  async createWishlistItem(id: string, input: WishlistInput) {
    await this.database.insert(wishlistItems).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      name: input.name,
      url: input.url,
      estimatedPriceCents:
        input.estimatedPriceCents === undefined ? undefined : BigInt(input.estimatedPriceCents),
      currency: input.currency,
      priority: input.priority,
      reason: input.reason,
      plannedOn: input.plannedOn,
    });
    return {
      id,
      name: input.name,
      url: input.url ?? null,
      estimatedPriceCents: input.estimatedPriceCents ?? null,
      currency: input.currency,
      priority: input.priority,
      reason: input.reason ?? null,
      plannedOn: input.plannedOn ?? null,
      status: "PLANNED" as const,
      actualPriceCents: null,
      purchasedOn: null,
      transactionId: null,
      version: 1,
    };
  }
  async updateWishlistItem(id: string, input: WishlistPatch) {
    const rows = await this.database
      .update(wishlistItems)
      .set({
        name: input.name,
        url: input.url ?? null,
        estimatedPriceCents:
          input.estimatedPriceCents === undefined ? null : BigInt(input.estimatedPriceCents),
        currency: input.currency,
        priority: input.priority,
        reason: input.reason ?? null,
        plannedOn: input.plannedOn ?? null,
        version: sql`${wishlistItems.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wishlistItems.workspaceId, this.context.workspaceId),
          eq(wishlistItems.publicId, id),
          eq(wishlistItems.version, input.expectedVersion),
          ne(wishlistItems.status, "ARCHIVED"),
        ),
      )
      .returning();
    const item = rows[0];
    if (!item) this.resourceConflict("Desejo");
    return mapWishlistItem(item);
  }
  async archiveWishlistItem(id: string, expectedVersion: number) {
    const rows = await this.database
      .update(wishlistItems)
      .set({
        status: "ARCHIVED",
        version: sql`${wishlistItems.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wishlistItems.workspaceId, this.context.workspaceId),
          eq(wishlistItems.publicId, id),
          eq(wishlistItems.version, expectedVersion),
          ne(wishlistItems.status, "ARCHIVED"),
        ),
      )
      .returning({ id: wishlistItems.id });
    if (!rows[0]) this.resourceConflict("Desejo");
  }
  async purchaseWishlistItem(id: string, transactionId: string, input: WishlistPurchaseInput) {
    const prior = (
      await this.database
        .select({
          status: wishlistItems.status,
          transactionId: transactions.publicId,
        })
        .from(wishlistItems)
        .leftJoin(wishlistPurchaseLinks, eq(wishlistItems.id, wishlistPurchaseLinks.itemId))
        .leftJoin(transactions, eq(transactions.id, wishlistPurchaseLinks.transactionId))
        .where(
          and(
            eq(wishlistItems.workspaceId, this.context.workspaceId),
            eq(wishlistItems.publicId, id),
          ),
        )
        .limit(1)
    )[0];
    if (prior?.status === "PURCHASED")
      return { itemId: id, transactionId: prior.transactionId ?? null, repeated: true };
    const item = (
      await this.database
        .select({
          id: wishlistItems.id,
          name: wishlistItems.name,
          currency: wishlistItems.currency,
        })
        .from(wishlistItems)
        .where(
          and(
            eq(wishlistItems.workspaceId, this.context.workspaceId),
            eq(wishlistItems.publicId, id),
            eq(wishlistItems.version, input.expectedVersion),
            eq(wishlistItems.status, "PLANNED"),
          ),
        )
        .limit(1)
    )[0];
    if (!item)
      throw new ApplicationError("Item inválido ou já alterado.", {
        category: "validation",
        code: "WISHLIST_PURCHASE_INVALID",
      });
    if (!input.createTransaction) {
      await this.database
        .update(wishlistItems)
        .set({
          status: "PURCHASED",
          actualPriceCents: BigInt(input.amountCents),
          purchasedOn: input.purchasedOn,
          version: sql`${wishlistItems.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(wishlistItems.id, item.id));
      return { itemId: id, transactionId: null, repeated: false };
    }
    const accountId = input.accountId;
    const categoryId = input.categoryId;
    if (!accountId || !categoryId)
      throw new ApplicationError("Conta e categoria são obrigatórias para criar a despesa.", {
        category: "validation",
        code: "WISHLIST_PURCHASE_INVALID",
      });
    const account = (
      await this.database
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, this.context.workspaceId),
            eq(accounts.publicId, accountId),
            eq(accounts.currency, item.currency),
            eq(accounts.active, true),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    const category = (
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
    )[0];
    if (!account || !category)
      throw new ApplicationError("Conta ou categoria inválida para a compra.", {
        category: "validation",
        code: "WISHLIST_PURCHASE_INVALID",
      });
    const transactionRows = await this.database
      .insert(transactions)
      .values({
        publicId: transactionId,
        workspaceId: this.context.workspaceId,
        accountId: account.id,
        categoryId: category.id,
        type: "EXPENSE",
        status: "SETTLED",
        amountCents: BigInt(input.amountCents),
        currency: item.currency,
        description: item.name,
        occurredOn: input.purchasedOn,
        competenceMonth: input.purchasedOn.slice(0, 7),
        settledOn: input.purchasedOn,
        sourceModule: "WL",
        sourcePublicId: id,
        sourceSequence: 1,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning({ id: transactions.id });
    const transaction = transactionRows[0];
    if (!transaction) throw new Error("Wishlist transaction insert did not return a row.");
    await this.database.insert(transactionHistory).values({
      workspaceId: this.context.workspaceId,
      transactionId: transaction.id,
      transactionPublicId: transactionId,
      version: 1,
      action: "CREATED",
      actorId: this.context.userId,
      snapshot: {
        id: transactionId,
        accountId,
        categoryId,
        type: "EXPENSE",
        status: "SETTLED",
        amountCents: input.amountCents,
        currency: item.currency,
        description: item.name,
        occurredOn: input.purchasedOn,
        competenceMonth: input.purchasedOn.slice(0, 7),
        settledOn: input.purchasedOn,
        sourceModule: "WL",
        sourcePublicId: id,
        location: null,
        version: 1,
        deletedAt: null,
      },
    });
    await this.database.insert(wishlistPurchaseLinks).values({
      workspaceId: this.context.workspaceId,
      itemId: item.id,
      transactionId: transaction.id,
    });
    await this.database
      .update(wishlistItems)
      .set({
        status: "PURCHASED",
        actualPriceCents: BigInt(input.amountCents),
        purchasedOn: input.purchasedOn,
        version: sql`${wishlistItems.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, item.id));
    return { itemId: id, transactionId, repeated: false };
  }

  async listNotifications(query: Parameters<IOperationsRepository["listNotifications"]>[0]) {
    return this.notificationRepository.listNotifications(query);
  }
  async readAllNotifications() {
    return this.notificationRepository.readAllNotifications();
  }
  async readNotification(id: string) {
    await this.notificationRepository.readNotification(id);
  }

  async listPlans() {
    const planRows = await this.database
      .select({ id: plans.id, publicId: plans.publicId, code: plans.code, name: plans.name })
      .from(plans)
      .where(eq(plans.active, true));
    const result = [];
    for (const plan of planRows) {
      const version = (
        await this.database
          .select()
          .from(planVersions)
          .where(
            and(
              eq(planVersions.planId, plan.id),
              lte(planVersions.effectiveFrom, new Date()),
              isNull(planVersions.retiredAt),
            ),
          )
          .orderBy(desc(planVersions.version))
          .limit(1)
      )[0];
      if (version)
        result.push({
          id: plan.publicId,
          code: plan.code,
          name: plan.name,
          versionId: version.publicId,
          version: version.version,
          currency: version.currency,
          priceCents: mapOptionalMoney(version.priceCents) ?? 0,
          entitlements: version.entitlements,
        });
    }
    return result.sort((left, right) => left.priceCents - right.priceCents);
  }
  async getSubscription() {
    const row = (
      await this.database
        .select({
          id: subscriptions.publicId,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          code: plans.code,
          name: plans.name,
          entitlements: planVersions.entitlements,
        })
        .from(subscriptions)
        .innerJoin(planVersions, eq(planVersions.id, subscriptions.planVersionId))
        .innerJoin(plans, eq(plans.id, planVersions.planId))
        .where(eq(subscriptions.workspaceId, this.context.workspaceId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
    )[0];
    return row ? { ...row, currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null } : null;
  }

  async getBillingUsage(query: Parameters<IOperationsRepository["getBillingUsage"]>[0]) {
    const [cursorKey, cursorPeriod] = decodeCompositeCursor(query.cursor, 2) ?? [];
    const rows = await this.database
      .select({
        key: usageCounters.key,
        period: usageCounters.period,
        value: usageCounters.value,
        updatedAt: usageCounters.updatedAt,
      })
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.workspaceId, this.context.workspaceId),
          ...(cursorKey && cursorPeriod
            ? [
                sql`(${usageCounters.key}, ${usageCounters.period}) > (${cursorKey}, ${cursorPeriod})`,
              ]
            : []),
        ),
      )
      .orderBy(asc(usageCounters.key), asc(usageCounters.period))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map((row) => ({
        ...row,
        value: mapOptionalMoney(row.value) ?? 0,
        updatedAt: row.updatedAt.toISOString(),
      })),
      query.limit,
      (row) => encodeCompositeCursor(row.key, row.period),
    );
  }

  async listLegalDocuments() {
    const rows = await this.database
      .select({
        id: legalDocuments.publicId,
        kind: legalDocuments.kind,
        version: legalDocuments.version,
        title: legalDocuments.title,
        contentUri: legalDocuments.contentUri,
        effectiveAt: legalDocuments.effectiveAt,
      })
      .from(legalDocuments)
      .where(and(lte(legalDocuments.effectiveAt, new Date()), isNull(legalDocuments.retiredAt)))
      .orderBy(asc(legalDocuments.kind), desc(legalDocuments.effectiveAt));
    return rows.map((row) => ({ ...row, effectiveAt: row.effectiveAt.toISOString() }));
  }
  async createConsent(id: string, input: ConsentInput, consentedAt: Date) {
    const document = (
      await this.database
        .select({ id: legalDocuments.id })
        .from(legalDocuments)
        .where(
          and(
            eq(legalDocuments.publicId, input.documentId),
            lte(legalDocuments.effectiveAt, consentedAt),
            isNull(legalDocuments.retiredAt),
          ),
        )
        .limit(1)
    )[0];
    if (!document)
      throw new ApplicationError("Documento não encontrado.", {
        category: "not-found",
        code: "LEGAL_DOCUMENT_NOT_FOUND",
      });
    await this.database.insert(consents).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      userId: this.context.userId,
      documentId: document.id,
      purpose: input.purpose,
      evidence: { requestId: this.context.requestId },
      consentedAt,
    });
    return { id, ...input, consentedAt: consentedAt.toISOString() };
  }
  async requestPrivacyExport(
    ids: Readonly<{ requestId: string; exportId: string; jobId: string }>,
  ) {
    const subjectRows = await this.database
      .insert(dataSubjectRequests)
      .values({
        publicId: ids.requestId,
        workspaceId: this.context.workspaceId,
        userId: this.context.userId,
        kind: "EXPORT",
      })
      .returning({ id: dataSubjectRequests.id });
    const subject = subjectRows[0];
    if (!subject) throw new Error("Subject request insert did not return a row.");
    await this.database.insert(dataExportRequests).values({
      publicId: ids.exportId,
      workspaceId: this.context.workspaceId,
      subjectRequestId: subject.id,
    });
    await this.database.insert(jobRuns).values({
      publicId: ids.jobId,
      workspaceId: this.context.workspaceId,
      jobName: "privacy-export",
      jobVersion: 1,
      executionKey: `privacy-export:${ids.requestId}`,
      payload: { requestId: ids.requestId, exportId: ids.exportId },
    });
  }
  async requestDeletion(
    ids: Readonly<{ requestId: string; deletionId: string }>,
    executeAfter: Date,
  ) {
    const subjectRows = await this.database
      .insert(dataSubjectRequests)
      .values({
        publicId: ids.requestId,
        workspaceId: this.context.workspaceId,
        userId: this.context.userId,
        kind: "DELETION",
      })
      .returning({ id: dataSubjectRequests.id });
    const subject = subjectRows[0];
    if (!subject) throw new Error("Subject request insert did not return a row.");
    await this.database.insert(accountDeletionRequests).values({
      publicId: ids.deletionId,
      workspaceId: this.context.workspaceId,
      subjectRequestId: subject.id,
      executeAfter,
    });
  }

  async getPrivacyExport(id: string) {
    const row = (
      await this.database
        .select({
          id: dataExportRequests.publicId,
          requestId: dataSubjectRequests.publicId,
          status: dataSubjectRequests.status,
          encrypted: dataExportRequests.encrypted,
          expiresAt: dataExportRequests.expiresAt,
          downloadedAt: dataExportRequests.downloadedAt,
        })
        .from(dataExportRequests)
        .innerJoin(
          dataSubjectRequests,
          eq(dataSubjectRequests.id, dataExportRequests.subjectRequestId),
        )
        .where(
          and(
            eq(dataExportRequests.workspaceId, this.context.workspaceId),
            eq(dataExportRequests.publicId, id),
            eq(dataSubjectRequests.userId, this.context.userId),
          ),
        )
        .limit(1)
    )[0];
    return row
      ? {
          ...row,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          downloadedAt: row.downloadedAt?.toISOString() ?? null,
        }
      : null;
  }

  async createPrivacyDownloadToken(id: string, tokenHash: string, now: Date) {
    const row = (
      await this.database
        .select({ id: dataExportRequests.id })
        .from(dataExportRequests)
        .innerJoin(
          dataSubjectRequests,
          eq(dataSubjectRequests.id, dataExportRequests.subjectRequestId),
        )
        .where(
          and(
            eq(dataExportRequests.workspaceId, this.context.workspaceId),
            eq(dataExportRequests.publicId, id),
            eq(dataSubjectRequests.userId, this.context.userId),
            eq(dataSubjectRequests.status, "READY"),
            gt(dataExportRequests.expiresAt, now),
            isNull(dataExportRequests.downloadedAt),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!row) return false;
    const updated = await this.database
      .update(dataExportRequests)
      .set({ downloadTokenHash: tokenHash })
      .where(and(eq(dataExportRequests.id, row.id), isNull(dataExportRequests.downloadedAt)))
      .returning({ id: dataExportRequests.id });
    return Boolean(updated[0]);
  }

  async consumePrivacyDownloadToken(id: string, tokenHash: string, consumedAt: Date) {
    const row = (
      await this.database
        .select({
          exportId: dataExportRequests.id,
          subjectRequestId: dataSubjectRequests.id,
          storageKey: dataExportRequests.storageKey,
        })
        .from(dataExportRequests)
        .innerJoin(
          dataSubjectRequests,
          eq(dataSubjectRequests.id, dataExportRequests.subjectRequestId),
        )
        .where(
          and(
            eq(dataExportRequests.workspaceId, this.context.workspaceId),
            eq(dataExportRequests.publicId, id),
            eq(dataExportRequests.downloadTokenHash, tokenHash),
            eq(dataSubjectRequests.userId, this.context.userId),
            eq(dataSubjectRequests.status, "READY"),
            gt(dataExportRequests.expiresAt, consumedAt),
            isNull(dataExportRequests.downloadedAt),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!row?.storageKey) return null;
    const updated = await this.database
      .update(dataExportRequests)
      .set({ downloadedAt: consumedAt, downloadTokenHash: null })
      .where(and(eq(dataExportRequests.id, row.exportId), isNull(dataExportRequests.downloadedAt)))
      .returning({ id: dataExportRequests.id });
    if (!updated[0]) return null;
    await this.database
      .update(dataSubjectRequests)
      .set({ status: "COMPLETED", completedAt: consumedAt })
      .where(eq(dataSubjectRequests.id, row.subjectRequestId));
    return { storageKey: row.storageKey };
  }

  async findPrivacyDownloadArtifact(id: string, tokenHash: string, now: Date) {
    const row = (
      await this.database
        .select({ storageKey: dataExportRequests.storageKey })
        .from(dataExportRequests)
        .innerJoin(
          dataSubjectRequests,
          eq(dataSubjectRequests.id, dataExportRequests.subjectRequestId),
        )
        .where(
          and(
            eq(dataExportRequests.workspaceId, this.context.workspaceId),
            eq(dataExportRequests.publicId, id),
            eq(dataExportRequests.downloadTokenHash, tokenHash),
            eq(dataSubjectRequests.userId, this.context.userId),
            eq(dataSubjectRequests.status, "READY"),
            gt(dataExportRequests.expiresAt, now),
            isNull(dataExportRequests.downloadedAt),
          ),
        )
        .limit(1)
    )[0];
    return row?.storageKey ? { storageKey: row.storageKey } : null;
  }

  async cancelDeletion(id: string, cancelledAt: Date) {
    const deletion = (
      await this.database
        .select({ id: accountDeletionRequests.id })
        .from(accountDeletionRequests)
        .innerJoin(
          dataSubjectRequests,
          eq(dataSubjectRequests.id, accountDeletionRequests.subjectRequestId),
        )
        .where(
          and(
            eq(accountDeletionRequests.workspaceId, this.context.workspaceId),
            eq(accountDeletionRequests.publicId, id),
            eq(dataSubjectRequests.userId, this.context.userId),
            isNull(accountDeletionRequests.cancelledAt),
            isNull(accountDeletionRequests.completedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!deletion) return false;
    const rows = await this.database
      .update(accountDeletionRequests)
      .set({ cancelledAt })
      .where(
        and(
          eq(accountDeletionRequests.id, deletion.id),
          isNull(accountDeletionRequests.cancelledAt),
          isNull(accountDeletionRequests.completedAt),
        ),
      )
      .returning({ id: accountDeletionRequests.id });
    return rows.length === 1;
  }

  async listSensitiveAccess(query: Parameters<IOperationsRepository["listSensitiveAccess"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        id: sensitiveAccessLog.publicId,
        actorType: sensitiveAccessLog.actorType,
        actorId: sensitiveAccessLog.actorPublicId,
        action: sensitiveAccessLog.action,
        purpose: sensitiveAccessLog.purpose,
        resourceType: sensitiveAccessLog.resourceType,
        requestId: sensitiveAccessLog.requestId,
        occurredAt: sensitiveAccessLog.occurredAt,
      })
      .from(sensitiveAccessLog)
      .where(
        and(
          eq(sensitiveAccessLog.workspaceId, this.context.workspaceId),
          ...(cursor ? [lt(sensitiveAccessLog.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(sensitiveAccessLog.publicId))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() })),
      query.limit,
    );
  }

  private requireActivity(items: ReadonlyMap<string, bigint>, id: string): bigint {
    const value = items.get(id);
    if (value === undefined) throw new Error("Validated planner activity is missing.");
    return value;
  }
  private templateConflict(): never {
    throw new ApplicationError("Template não encontrado ou desatualizado.", {
      category: "conflict",
      code: "VERSION_CONFLICT",
    });
  }
  private resourceConflict(resource: string): never {
    throw new ApplicationError(`${resource} não encontrado ou desatualizado.`, {
      category: "conflict",
      code: "VERSION_CONFLICT",
    });
  }
}
