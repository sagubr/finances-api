import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  cardInputSchema,
  cardPatchSchema,
  cardPurchaseInputSchema,
  cardPurchaseParamsSchema,
  cardPurchasePatchSchema,
  cardPurchaseResponseSchema,
  creditCardListResponseSchema,
  creditCardResponseSchema,
  planningListQuerySchema,
  resourceIdParamsSchema,
  statementCloseResponseSchema,
  statementListResponseSchema,
  statementPaymentInputSchema,
  statementPaymentResponseSchema,
  statementReopenResponseSchema,
  statementResponseSchema,
  versionInputSchema,
  type CardInput,
  type CardPatch,
  type CardPurchaseInput,
  type CardPurchaseParams,
  type CardPurchasePatch,
  type PlanningListQuery,
  type ResourceIdParams,
  type StatementPaymentInput,
  type VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { cardControllers } from "#/modules/planning/factories/card.factory.js";
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
export type CardRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
} as const;
export const cardRoutes: FastifyPluginAsyncZod<CardRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: PlanningListQuery; Headers: WorkspaceHeaders }>(
    "/credit-cards",
    {
      schema: {
        operationId: "listCreditCards",
        tags: ["Credit Cards"],
        headers: workspaceHeadersSchema,
        querystring: planningListQuerySchema,
        response: { 200: creditCardListResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.list.handle(request),
  );
  app.post<{ Body: CardInput; Headers: WorkspaceMutationHeaders }>(
    "/credit-cards",
    {
      onRequest: csrf,
      schema: {
        operationId: "createCreditCard",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        body: cardInputSchema,
        response: { 201: creditCardResponseSchema, ...errors },
      },
    },
    (request, reply) => cardControllers.create.handle(request, reply),
  );
  app.patch<{
    Params: ResourceIdParams;
    Body: CardPatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/credit-cards/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateCreditCard",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: cardPatchSchema,
        response: { 200: creditCardResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.update.handle(request),
  );
  app.delete<{
    Params: ResourceIdParams;
    Body: VersionInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/credit-cards/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteCreditCard",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => cardControllers.delete.handle(request, reply),
  );
  app.post<{
    Params: ResourceIdParams;
    Body: CardPurchaseInput;
    Headers: WorkspaceIdempotencyMutationHeaders;
  }>(
    "/credit-cards/:id/purchases",
    {
      onRequest: csrf,
      schema: {
        operationId: "createCardPurchase",
        tags: ["Credit Cards"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: cardPurchaseInputSchema,
        response: { 201: cardPurchaseResponseSchema, ...errors },
      },
    },
    (request, reply) => cardControllers.purchase.handle(request, reply),
  );
  app.patch<{
    Params: CardPurchaseParams;
    Body: CardPurchasePatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/credit-cards/:id/purchases/:purchaseId",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateCardPurchase",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        params: cardPurchaseParamsSchema,
        body: cardPurchasePatchSchema,
        response: { 200: cardPurchaseResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.updatePurchase.handle(request),
  );
  app.delete<{
    Params: CardPurchaseParams;
    Body: VersionInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/credit-cards/:id/purchases/:purchaseId",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteCardPurchase",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        params: cardPurchaseParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => cardControllers.deletePurchase.handle(request, reply),
  );
  app.get<{
    Params: ResourceIdParams;
    Querystring: PlanningListQuery;
    Headers: WorkspaceHeaders;
  }>(
    "/credit-cards/:id/statements",
    {
      schema: {
        operationId: "listCardStatements",
        tags: ["Credit Cards"],
        headers: workspaceHeadersSchema,
        params: resourceIdParamsSchema,
        querystring: planningListQuerySchema,
        response: { 200: statementListResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.listStatements.handle(request),
  );
  app.get<{
    Params: ResourceIdParams;
    Querystring: PlanningListQuery;
    Headers: WorkspaceHeaders;
  }>(
    "/statements/:id",
    {
      schema: {
        operationId: "getCardStatement",
        tags: ["Credit Cards"],
        headers: workspaceHeadersSchema,
        params: resourceIdParamsSchema,
        querystring: planningListQuerySchema,
        response: { 200: statementResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.getStatement.handle(request),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/statements/:id/close",
    {
      onRequest: csrf,
      schema: {
        operationId: "closeCardStatement",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: statementCloseResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.closeStatement.handle(request),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/statements/:id/reopen",
    {
      onRequest: csrf,
      schema: {
        operationId: "reopenCardStatement",
        tags: ["Credit Cards"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: statementReopenResponseSchema, ...errors },
      },
    },
    (request) => cardControllers.reopenStatement.handle(request),
  );
  app.post<{
    Params: ResourceIdParams;
    Body: StatementPaymentInput;
    Headers: WorkspaceIdempotencyMutationHeaders;
  }>(
    "/statements/:id/pay",
    {
      onRequest: csrf,
      schema: {
        operationId: "payCardStatement",
        tags: ["Credit Cards"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: statementPaymentInputSchema,
        response: { 201: statementPaymentResponseSchema, ...errors },
      },
    },
    (request, reply) => cardControllers.payStatement.handle(request, reply),
  );
  return Promise.resolve();
};
