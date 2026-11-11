import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  operationIdParamsSchema,
  operationVersionInputSchema,
  wishlistInputSchema,
  wishlistListQuerySchema,
  wishlistListResponseSchema,
  wishlistPatchSchema,
  wishlistPurchaseInputSchema,
  wishlistPurchaseResponseSchema,
  wishlistResponseSchema,
  wishlistSummaryQuerySchema,
  wishlistSummaryResponseSchema,
  type OperationIdParams,
  type WishlistInput,
  type WishlistListQuery,
  type WishlistPatch,
  type WishlistPurchaseInput,
  type WishlistSummaryQuery,
} from "#/modules/operations/dtos/operations.dto.js";
import { wishlistControllers } from "#/modules/operations/factories/wishlist.factory.js";
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

export type WishlistRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  503: apiErrorResponseSchema,
} as const;

export const wishlistRoutes: FastifyPluginAsyncZod<WishlistRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));

  app.get<{ Querystring: WishlistListQuery; Headers: WorkspaceHeaders }>(
    "/wishlist",
    {
      schema: {
        operationId: "listWishlist",
        tags: ["Wishlist"],
        headers: workspaceHeadersSchema,
        querystring: wishlistListQuerySchema,
        response: { 200: wishlistListResponseSchema, ...errors },
      },
    },
    (request) => wishlistControllers.list.handle(request),
  );
  app.get<{ Querystring: WishlistSummaryQuery; Headers: WorkspaceHeaders }>(
    "/wishlist/summary",
    {
      schema: {
        operationId: "getWishlistSummary",
        tags: ["Wishlist"],
        headers: workspaceHeadersSchema,
        querystring: wishlistSummaryQuerySchema,
        response: { 200: wishlistSummaryResponseSchema, ...errors },
      },
    },
    (request) => wishlistControllers.summary.handle(request),
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
    (request, reply) => wishlistControllers.create.handle(request, reply),
  );
  app.patch<{ Params: OperationIdParams; Body: WishlistPatch; Headers: WorkspaceMutationHeaders }>(
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
    (request) => wishlistControllers.update.handle(request),
  );

  const archive = {
    onRequest: csrf,
    schema: {
      tags: ["Wishlist"],
      headers: workspaceMutationHeadersSchema,
      params: operationIdParamsSchema,
      body: operationVersionInputSchema,
      response: { 204: noContentResponseSchema, ...errors },
    },
  } as const;
  app.post<{
    Params: OperationIdParams;
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/wishlist/:id/archive",
    { ...archive, schema: { ...archive.schema, operationId: "archiveWishlistItem" } },
    (request, reply) => wishlistControllers.archive.handle(request, reply),
  );
  app.delete<{
    Params: OperationIdParams;
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/wishlist/:id",
    { ...archive, schema: { ...archive.schema, operationId: "deleteWishlistItem" } },
    (request, reply) => wishlistControllers.archive.handle(request, reply),
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
    (request) => wishlistControllers.purchase.handle(request),
  );
  return Promise.resolve();
};
