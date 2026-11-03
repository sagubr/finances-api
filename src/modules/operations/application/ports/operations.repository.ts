import type {
  ActivityInput,
  ActivityPatch,
  ActivityView,
  ConsentInput,
  ConsentView,
  GoalCheckinInput,
  GoalCheckinView,
  GoalInput,
  GoalPatch,
  GoalProgressView,
  GoalView,
  LegalDocumentView,
  NotificationView,
  PlannerTemplateView,
  PlannerWeekView,
  PlanView,
  SlotsInput,
  SubscriptionView,
  WishlistInput,
  WishlistItemView,
  WishlistPatch,
  WishlistPurchaseInput,
  WishlistPurchaseView,
} from "#/modules/operations/dtos/operations.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
export interface IOperationsRepository {
  listActivities(query: CursorPaginationQuery): Promise<CursorPage<ActivityView>>;
  createActivity(id: string, input: ActivityInput): Promise<ActivityView>;
  updateActivity(id: string, input: ActivityPatch): Promise<ActivityView>;
  archiveActivity(id: string, expectedVersion: number): Promise<void>;
  saveTemplate(
    id: string,
    input: SlotsInput,
    generateId: () => string,
  ): Promise<PlannerTemplateView>;
  getWeek(referenceDate: string): Promise<PlannerWeekView>;
  listGoals(query: CursorPaginationQuery): Promise<CursorPage<GoalView>>;
  createGoal(id: string, input: GoalInput): Promise<GoalView>;
  updateGoal(id: string, input: GoalPatch): Promise<GoalView>;
  archiveGoal(id: string, expectedVersion: number): Promise<void>;
  createGoalCheckin(id: string, goalId: string, input: GoalCheckinInput): Promise<GoalCheckinView>;
  getGoalProgress(id: string, calculatedAt: string): Promise<GoalProgressView>;
  listWishlist(query: CursorPaginationQuery): Promise<CursorPage<WishlistItemView>>;
  createWishlistItem(id: string, input: WishlistInput): Promise<WishlistItemView>;
  updateWishlistItem(id: string, input: WishlistPatch): Promise<WishlistItemView>;
  archiveWishlistItem(id: string, expectedVersion: number): Promise<void>;
  purchaseWishlistItem(
    id: string,
    transactionId: string,
    input: WishlistPurchaseInput,
  ): Promise<WishlistPurchaseView>;
  listNotifications(query: CursorPaginationQuery): Promise<CursorPage<NotificationView>>;
  readAllNotifications(): Promise<number>;
  readNotification(id: string): Promise<void>;
  listPlans(): Promise<readonly PlanView[]>;
  getSubscription(): Promise<SubscriptionView | null>;
  getBillingUsage(
    query: CursorPaginationQuery,
  ): Promise<
    CursorPage<Readonly<{ key: string; period: string; value: number; updatedAt: string }>>
  >;
  listLegalDocuments(): Promise<readonly LegalDocumentView[]>;
  createConsent(id: string, input: ConsentInput, consentedAt: Date): Promise<ConsentView>;
  requestPrivacyExport(
    ids: Readonly<{ requestId: string; exportId: string; jobId: string }>,
  ): Promise<void>;
  requestDeletion(
    ids: Readonly<{ requestId: string; deletionId: string }>,
    executeAfter: Date,
  ): Promise<void>;
  getPrivacyExport(id: string): Promise<Readonly<{
    id: string;
    requestId: string;
    status: "REQUESTED" | "PROCESSING" | "READY" | "COMPLETED" | "CANCELLED" | "FAILED";
    encrypted: boolean;
    expiresAt: string | null;
    downloadedAt: string | null;
  }> | null>;
  createPrivacyDownloadToken(id: string, tokenHash: string, now: Date): Promise<boolean>;
  findPrivacyDownloadArtifact(
    id: string,
    tokenHash: string,
    now: Date,
  ): Promise<Readonly<{ storageKey: string }> | null>;
  consumePrivacyDownloadToken(
    id: string,
    tokenHash: string,
    consumedAt: Date,
  ): Promise<Readonly<{ storageKey: string }> | null>;
  cancelDeletion(id: string, cancelledAt: Date): Promise<boolean>;
  listSensitiveAccess(query: CursorPaginationQuery): Promise<
    CursorPage<
      Readonly<{
        id: string;
        actorType: string;
        actorId: string | null;
        action: string;
        purpose: string;
        resourceType: string;
        requestId: string;
        occurredAt: string;
      }>
    >
  >;
}
