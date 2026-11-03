import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import {
  workspaceHeadersSchema,
  workspaceIdempotencyMutationHeadersSchema,
  workspaceMutationHeadersSchema,
  type WorkspaceHeaders,
  type WorkspaceIdempotencyMutationHeaders,
  type WorkspaceMutationHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import {
  accountInputSchema,
  accountListResponseSchema,
  accountPatchSchema,
  accountResponseSchema,
  resourceIdParamsSchema,
  resourceListQuerySchema,
  versionInputSchema,
  type AccountInput,
  type AccountPatch,
  type ResourceIdParams,
  type ResourceListQuery,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { accountControllers } from "#/modules/transactions/factories/account.factory.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type AccountRoutesOptions = Readonly<{
  requestContextResolver: IRequestContextResolver;
}>;

export const accountRoutes: FastifyPluginAsyncZod<AccountRoutesOptions> = (
  app,
  { requestContextResolver },
) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(requestContextResolver));
  app.get<{ Querystring: ResourceListQuery; Headers: WorkspaceHeaders }>(
    "/accounts",
    {
      schema: {
        operationId: "listAccounts",
        tags: ["Accounts"],
        headers: workspaceHeadersSchema,
        querystring: resourceListQuerySchema,
        response: {
          200: accountListResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => accountControllers.list.handle(request, reply),
  );
  app.post<{ Body: AccountInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/accounts",
    {
      onRequest: csrf,
      schema: {
        operationId: "createAccount",
        tags: ["Accounts"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: accountInputSchema,
        response: {
          201: accountResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => accountControllers.create.handle(request, reply),
  );
  app.patch<{ Params: ResourceIdParams; Body: AccountPatch; Headers: WorkspaceMutationHeaders }>(
    "/accounts/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateAccount",
        tags: ["Accounts"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: accountPatchSchema,
        response: {
          200: accountResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => accountControllers.update.handle(request, reply),
  );
  app.delete<{
    Params: ResourceIdParams;
    Body: { expectedVersion: number };
    Headers: WorkspaceMutationHeaders;
  }>(
    "/accounts/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteAccount",
        tags: ["Accounts"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: {
          204: noContentResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => accountControllers.remove.handle(request, reply),
  );

  return Promise.resolve();
};
