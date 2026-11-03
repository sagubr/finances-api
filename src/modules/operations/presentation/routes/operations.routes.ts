import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  activityInputSchema,
  activityListResponseSchema,
  activityPatchSchema,
  activityResponseSchema,
  billingProviderPayloadSchema,
  billingUsageQuerySchema,
  billingUsageResponseSchema,
  consentInputSchema,
  consentResponseSchema,
  deletionCancelResponseSchema,
  goalCheckinInputSchema,
  goalCheckinResponseSchema,
  goalInputSchema,
  goalListResponseSchema,
  goalPatchSchema,
  goalProgressResponseSchema,
  goalResponseSchema,
  legalDocumentListResponseSchema,
  notificationListResponseSchema,
  notificationReadAllResponseSchema,
  notificationReadResponseSchema,
  operationIdParamsSchema,
  operationVersionInputSchema,
  operationsListQuerySchema,
  planListResponseSchema,
  plannerTemplateResponseSchema,
  plannerWeekQuerySchema,
  plannerWeekResponseSchema,
  privacyDeletionResponseSchema,
  privacyDownloadInputSchema,
  privacyDownloadResponseSchema,
  privacyDownloadTokenResponseSchema,
  privacyExportDetailResponseSchema,
  privacyExportResponseSchema,
  sensitiveAccessListResponseSchema,
  slotsInputSchema,
  subscriptionResponseSchema,
  wishlistInputSchema,
  wishlistListResponseSchema,
  wishlistPatchSchema,
  wishlistPurchaseInputSchema,
  wishlistPurchaseResponseSchema,
  wishlistResponseSchema,
  type ActivityInput,
  type ActivityPatch,
  type ConsentInput,
  type GoalCheckinInput,
  type GoalInput,
  type GoalPatch,
  type OperationIdParams,
  type OperationsListQuery,
  type PlannerWeekQuery,
  type PrivacyDownloadInput,
  type SlotsInput,
  type WishlistInput,
  type WishlistPatch,
  type WishlistPurchaseInput,
} from "#/modules/operations/dtos/operations.dto.js";
import { operationsControllers } from "#/modules/operations/factories/operations.factory.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import {
  workspaceHeadersSchema,
  workspaceIdempotencyMutationHeadersSchema,
  workspaceMutationHeadersSchema,
  type WorkspaceHeaders,
  type WorkspaceIdempotencyMutationHeaders,
  type WorkspaceMutationHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type OperationsRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  503: apiErrorResponseSchema,
} as const;
export const operationsRoutes: FastifyPluginAsyncZod<OperationsRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: OperationsListQuery; Headers: WorkspaceHeaders }>(
    "/planner/activities",
    {
      schema: {
        operationId: "listPlannerActivities",
        tags: ["Planner"],
        headers: workspaceHeadersSchema,
        querystring: operationsListQuerySchema,
        response: { 200: activityListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.activities.handle(request),
  );
  app.post<{ Body: ActivityInput; Headers: WorkspaceMutationHeaders }>(
    "/planner/activities",
    {
      onRequest: csrf,
      schema: {
        operationId: "createPlannerActivity",
        tags: ["Planner"],
        headers: workspaceMutationHeadersSchema,
        body: activityInputSchema,
        response: { 201: activityResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.createActivity.handle(request, reply),
  );
  app.patch<{
    Params: OperationIdParams;
    Body: ActivityPatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/planner/activities/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updatePlannerActivity",
        tags: ["Planner"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: activityPatchSchema,
        response: { 200: activityResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.updateActivity.handle(request),
  );
  app.delete<{
    Params: OperationIdParams;
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/planner/activities/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deletePlannerActivity",
        tags: ["Planner"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: operationVersionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.deleteActivity.handle(request, reply),
  );
  app.put<{ Body: SlotsInput; Headers: WorkspaceMutationHeaders }>(
    "/planner/template/slots",
    {
      onRequest: csrf,
      schema: {
        operationId: "savePlannerTemplate",
        tags: ["Planner"],
        headers: workspaceMutationHeadersSchema,
        body: slotsInputSchema,
        response: { 200: plannerTemplateResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.saveTemplate.handle(request),
  );
  app.get<{ Querystring: PlannerWeekQuery; Headers: WorkspaceHeaders }>(
    "/planner/week",
    {
      schema: {
        operationId: "getPlannerWeek",
        tags: ["Planner"],
        headers: workspaceHeadersSchema,
        querystring: plannerWeekQuerySchema,
        response: { 200: plannerWeekResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.week.handle(request),
  );
  app.get<{ Querystring: OperationsListQuery; Headers: WorkspaceHeaders }>(
    "/goals",
    {
      schema: {
        operationId: "listGoals",
        tags: ["Goals"],
        headers: workspaceHeadersSchema,
        querystring: operationsListQuerySchema,
        response: { 200: goalListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.goals.handle(request),
  );
  app.post<{ Body: GoalInput; Headers: WorkspaceMutationHeaders }>(
    "/goals",
    {
      onRequest: csrf,
      schema: {
        operationId: "createGoal",
        tags: ["Goals"],
        headers: workspaceMutationHeadersSchema,
        body: goalInputSchema,
        response: { 201: goalResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.createGoal.handle(request, reply),
  );
  app.patch<{ Params: OperationIdParams; Body: GoalPatch; Headers: WorkspaceMutationHeaders }>(
    "/goals/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateGoal",
        tags: ["Goals"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: goalPatchSchema,
        response: { 200: goalResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.updateGoal.handle(request),
  );
  app.delete<{
    Params: OperationIdParams;
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/goals/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteGoal",
        tags: ["Goals"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: operationVersionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.deleteGoal.handle(request, reply),
  );
  app.post<{
    Params: OperationIdParams;
    Body: GoalCheckinInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/goals/:id/checkins",
    {
      onRequest: csrf,
      schema: {
        operationId: "createGoalCheckin",
        tags: ["Goals"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: goalCheckinInputSchema,
        response: { 201: goalCheckinResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.createCheckin.handle(request, reply),
  );
  app.get<{ Params: OperationIdParams; Headers: WorkspaceHeaders }>(
    "/goals/:id/progress",
    {
      schema: {
        operationId: "getGoalProgress",
        tags: ["Goals"],
        headers: workspaceHeadersSchema,
        params: operationIdParamsSchema,
        response: { 200: goalProgressResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.goalProgress.handle(request),
  );
  app.get<{ Querystring: OperationsListQuery; Headers: WorkspaceHeaders }>(
    "/wishlist",
    {
      schema: {
        operationId: "listWishlist",
        tags: ["Wishlist"],
        headers: workspaceHeadersSchema,
        querystring: operationsListQuerySchema,
        response: { 200: wishlistListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.wishlist.handle(request),
  );
  app.post<{ Body: WishlistInput; Headers: WorkspaceMutationHeaders }>(
    "/wishlist",
    {
      onRequest: csrf,
      schema: {
        operationId: "createWishlistItem",
        tags: ["Wishlist"],
        headers: workspaceMutationHeadersSchema,
        body: wishlistInputSchema,
        response: { 201: wishlistResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.createWishlist.handle(request, reply),
  );
  app.patch<{
    Params: OperationIdParams;
    Body: WishlistPatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/wishlist/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateWishlistItem",
        tags: ["Wishlist"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: wishlistPatchSchema,
        response: { 200: wishlistResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.updateWishlist.handle(request),
  );
  app.delete<{
    Params: OperationIdParams;
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/wishlist/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteWishlistItem",
        tags: ["Wishlist"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: operationVersionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.deleteWishlist.handle(request, reply),
  );
  app.post<{
    Params: OperationIdParams;
    Body: WishlistPurchaseInput;
    Headers: WorkspaceIdempotencyMutationHeaders;
  }>(
    "/wishlist/:id/purchase",
    {
      onRequest: csrf,
      schema: {
        operationId: "purchaseWishlistItem",
        tags: ["Wishlist"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: wishlistPurchaseInputSchema,
        response: { 200: wishlistPurchaseResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.purchaseWishlist.handle(request),
  );
  app.get<{ Querystring: OperationsListQuery; Headers: WorkspaceHeaders }>(
    "/notifications",
    {
      schema: {
        operationId: "listNotifications",
        tags: ["Notifications"],
        headers: workspaceHeadersSchema,
        querystring: operationsListQuerySchema,
        response: { 200: notificationListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.notifications.handle(request),
  );
  app.post<{ Headers: WorkspaceMutationHeaders }>(
    "/notifications/read-all",
    {
      onRequest: csrf,
      schema: {
        operationId: "readAllNotifications",
        tags: ["Notifications"],
        headers: workspaceMutationHeadersSchema,
        response: { 200: notificationReadAllResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.readAll.handle(request),
  );
  app.post<{ Params: OperationIdParams; Headers: WorkspaceMutationHeaders }>(
    "/notifications/:id/read",
    {
      onRequest: csrf,
      schema: {
        operationId: "readNotification",
        tags: ["Notifications"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        response: { 200: notificationReadResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.readNotification.handle(request),
  );
  app.get<{ Headers: WorkspaceHeaders }>(
    "/billing/plans",
    {
      schema: {
        operationId: "listBillingPlans",
        tags: ["Billing"],
        headers: workspaceHeadersSchema,
        response: { 200: planListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.plans.handle(request),
  );
  app.get<{ Headers: WorkspaceHeaders }>(
    "/billing/subscription",
    {
      schema: {
        operationId: "getBillingSubscription",
        tags: ["Billing"],
        headers: workspaceHeadersSchema,
        response: { 200: subscriptionResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.subscription.handle(request),
  );
  app.get<{ Querystring: OperationsListQuery; Headers: WorkspaceHeaders }>(
    "/billing/usage",
    {
      schema: {
        operationId: "getBillingUsage",
        tags: ["Billing"],
        headers: workspaceHeadersSchema,
        querystring: billingUsageQuerySchema,
        response: { 200: billingUsageResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.billingUsage.handle(request),
  );
  app.post(
    "/billing/checkout",
    {
      onRequest: csrf,
      schema: {
        hide: true,
        operationId: "createBillingCheckout",
        tags: ["Billing"],
        headers: workspaceMutationHeadersSchema,
        body: billingProviderPayloadSchema,
        response: errors,
      },
    },
    (request) => operationsControllers.billingProvider.handle(request),
  );
  app.post(
    "/billing/portal",
    {
      onRequest: csrf,
      schema: {
        hide: true,
        operationId: "createBillingPortal",
        tags: ["Billing"],
        headers: workspaceMutationHeadersSchema,
        body: billingProviderPayloadSchema,
        response: errors,
      },
    },
    (request) => operationsControllers.billingProvider.handle(request),
  );
  app.get<{ Headers: WorkspaceHeaders }>(
    "/privacy/documents",
    {
      schema: {
        operationId: "listLegalDocuments",
        tags: ["Privacy"],
        headers: workspaceHeadersSchema,
        response: { 200: legalDocumentListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.legalDocuments.handle(request),
  );
  app.post<{ Body: ConsentInput; Headers: WorkspaceMutationHeaders }>(
    "/privacy/consents",
    {
      onRequest: csrf,
      schema: {
        operationId: "createConsent",
        tags: ["Privacy"],
        headers: workspaceMutationHeadersSchema,
        body: consentInputSchema,
        response: { 201: consentResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.createConsent.handle(request, reply),
  );
  app.post<{ Headers: WorkspaceMutationHeaders }>(
    "/privacy/exports",
    {
      onRequest: csrf,
      schema: {
        operationId: "requestPrivacyExport",
        tags: ["Privacy"],
        headers: workspaceMutationHeadersSchema,
        response: { 202: privacyExportResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.privacyExport.handle(request, reply),
  );
  app.get<{ Params: OperationIdParams; Headers: WorkspaceHeaders }>(
    "/privacy/exports/:id",
    {
      schema: {
        operationId: "getPrivacyExport",
        tags: ["Privacy"],
        headers: workspaceHeadersSchema,
        params: operationIdParamsSchema,
        response: { 200: privacyExportDetailResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.privacyExportDetail.handle(request),
  );
  app.post<{ Params: OperationIdParams; Headers: WorkspaceMutationHeaders }>(
    "/privacy/exports/:id/download-token",
    {
      onRequest: csrf,
      schema: {
        operationId: "createPrivacyExportDownloadToken",
        tags: ["Privacy"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        response: { 200: privacyDownloadTokenResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.privacyDownloadToken.handle(request),
  );
  app.post<{
    Params: OperationIdParams;
    Body: PrivacyDownloadInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/privacy/exports/:id/download",
    {
      onRequest: csrf,
      schema: {
        operationId: "downloadPrivacyExport",
        tags: ["Privacy"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        body: privacyDownloadInputSchema,
        response: { 200: privacyDownloadResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.privacyDownload.handle(request, reply),
  );
  app.post<{ Headers: WorkspaceMutationHeaders }>(
    "/privacy/deletion",
    {
      onRequest: csrf,
      schema: {
        operationId: "requestAccountDeletion",
        tags: ["Privacy"],
        headers: workspaceMutationHeadersSchema,
        response: { 202: privacyDeletionResponseSchema, ...errors },
      },
    },
    (request, reply) => operationsControllers.deletion.handle(request, reply),
  );
  app.post<{ Params: OperationIdParams; Headers: WorkspaceMutationHeaders }>(
    "/privacy/deletion/:id/cancel",
    {
      onRequest: csrf,
      schema: {
        operationId: "cancelAccountDeletion",
        tags: ["Privacy"],
        headers: workspaceMutationHeadersSchema,
        params: operationIdParamsSchema,
        response: { 200: deletionCancelResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.cancelDeletion.handle(request),
  );
  app.get<{ Querystring: OperationsListQuery; Headers: WorkspaceHeaders }>(
    "/privacy/access-log",
    {
      schema: {
        operationId: "listSensitiveAccess",
        tags: ["Privacy"],
        headers: workspaceHeadersSchema,
        querystring: operationsListQuerySchema,
        response: { 200: sensitiveAccessListResponseSchema, ...errors },
      },
    },
    (request) => operationsControllers.sensitiveAccess.handle(request),
  );
  return Promise.resolve();
};
