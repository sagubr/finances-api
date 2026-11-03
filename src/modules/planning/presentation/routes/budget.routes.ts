import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  budgetCopyResponseSchema,
  budgetInputSchema,
  budgetListResponseSchema,
  budgetPatchSchema,
  budgetProgressQuerySchema,
  budgetProgressResponseSchema,
  budgetQuerySchema,
  budgetResponseSchema,
  copyBudgetsInputSchema,
  resourceIdParamsSchema,
  versionInputSchema,
  type BudgetInput,
  type BudgetPatch,
  type BudgetProgressQuery,
  type BudgetQuery,
  type CopyBudgetsInput,
  type ResourceIdParams,
  type VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { budgetControllers } from "#/modules/planning/factories/budget.factory.js";
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
export type BudgetRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
} as const;
export const budgetRoutes: FastifyPluginAsyncZod<BudgetRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: BudgetQuery; Headers: WorkspaceHeaders }>(
    "/budgets",
    {
      schema: {
        operationId: "listBudgets",
        tags: ["Budgets"],
        headers: workspaceHeadersSchema,
        querystring: budgetQuerySchema,
        response: { 200: budgetListResponseSchema, ...errors },
      },
    },
    (request) => budgetControllers.list.handle(request),
  );
  app.post<{ Body: BudgetInput; Headers: WorkspaceMutationHeaders }>(
    "/budgets",
    {
      onRequest: csrf,
      schema: {
        operationId: "createBudget",
        tags: ["Budgets"],
        headers: workspaceMutationHeadersSchema,
        body: budgetInputSchema,
        response: { 201: budgetResponseSchema, ...errors },
      },
    },
    (request, reply) => budgetControllers.create.handle(request, reply),
  );
  app.patch<{ Params: ResourceIdParams; Body: BudgetPatch; Headers: WorkspaceMutationHeaders }>(
    "/budgets/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateBudget",
        tags: ["Budgets"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: budgetPatchSchema,
        response: { 200: budgetResponseSchema, ...errors },
      },
    },
    (request) => budgetControllers.update.handle(request),
  );
  app.delete<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/budgets/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteBudget",
        tags: ["Budgets"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => budgetControllers.remove.handle(request, reply),
  );
  app.post<{ Body: CopyBudgetsInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/budgets/copy",
    {
      onRequest: csrf,
      schema: {
        operationId: "copyBudgets",
        tags: ["Budgets"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: copyBudgetsInputSchema,
        response: { 201: budgetCopyResponseSchema, ...errors },
      },
    },
    (request, reply) => budgetControllers.copy.handle(request, reply),
  );
  app.get<{ Querystring: BudgetProgressQuery; Headers: WorkspaceHeaders }>(
    "/budgets/progress",
    {
      schema: {
        operationId: "getBudgetProgress",
        tags: ["Budgets"],
        headers: workspaceHeadersSchema,
        querystring: budgetProgressQuerySchema,
        response: { 200: budgetProgressResponseSchema, ...errors },
      },
    },
    (request) => budgetControllers.progress.handle(request),
  );
  return Promise.resolve();
};
