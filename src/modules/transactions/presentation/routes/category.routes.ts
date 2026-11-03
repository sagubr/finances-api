import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import type { WorkspaceMutationHeaders } from "#/modules/platform/dtos/request-context.dto.js";
import {
  workspaceHeadersSchema,
  workspaceIdempotencyMutationHeadersSchema,
  workspaceMutationHeadersSchema,
  type WorkspaceHeaders,
  type WorkspaceIdempotencyMutationHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import {
  categoryInputSchema,
  categoryListResponseSchema,
  categoryPatchSchema,
  categoryResponseSchema,
  resourceIdParamsSchema,
  resourceListQuerySchema,
  versionInputSchema,
  type CategoryInput,
  type CategoryPatch,
  type ResourceListQuery,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { categoryControllers } from "#/modules/transactions/factories/category.factory.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type CategoryRoutesOptions = Readonly<{
  requestContextResolver: IRequestContextResolver;
}>;

export const categoryRoutes: FastifyPluginAsyncZod<CategoryRoutesOptions> = (
  app,
  { requestContextResolver },
) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(requestContextResolver));

  app.get<{ Querystring: ResourceListQuery; Headers: WorkspaceHeaders }>(
    "/categories",
    {
      schema: {
        operationId: "listCategories",
        tags: ["Categories"],
        headers: workspaceHeadersSchema,
        querystring: resourceListQuerySchema,
        response: {
          200: categoryListResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => categoryControllers.list.handle(request, reply),
  );

  app.post<{ Body: CategoryInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/categories",
    {
      onRequest: csrf,
      schema: {
        operationId: "createCategory",
        tags: ["Categories"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: categoryInputSchema,
        response: {
          201: categoryResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => categoryControllers.create.handle(request, reply),
  );

  app.patch<{
    Params: { id: string };
    Body: CategoryPatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/categories/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateCategory",
        tags: ["Categories"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: categoryPatchSchema,
        response: { 200: categoryResponseSchema, 409: apiErrorResponseSchema },
      },
    },
    (request, reply) => categoryControllers.update.handle(request, reply),
  );

  app.delete<{
    Params: { id: string };
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/categories/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteCategory",
        tags: ["Categories"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, 409: apiErrorResponseSchema },
      },
    },
    (request, reply) => categoryControllers.delete.handle(request, reply),
  );

  return Promise.resolve();
};
