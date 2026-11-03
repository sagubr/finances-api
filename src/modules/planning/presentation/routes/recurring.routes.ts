import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  deleteRecurringInputSchema,
  planningListQuerySchema,
  recurringDeleteResponseSchema,
  recurringInputSchema,
  recurringPatchSchema,
  recurringRuleListResponseSchema,
  recurringRuleResponseSchema,
  recurringToggleResponseSchema,
  resourceIdParamsSchema,
  versionInputSchema,
  type DeleteRecurringInput,
  type PlanningListQuery,
  type RecurringInput,
  type RecurringPatch,
  type ResourceIdParams,
  type VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { recurringControllers } from "#/modules/planning/factories/recurring.factory.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import {
  workspaceHeadersSchema,
  workspaceIdempotencyMutationHeadersSchema,
  workspaceMutationHeadersSchema,
  type WorkspaceHeaders,
  type WorkspaceIdempotencyMutationHeaders,
  type WorkspaceMutationHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import { apiErrorResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type RecurringRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
} as const;
export const recurringRoutes: FastifyPluginAsyncZod<RecurringRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: PlanningListQuery; Headers: WorkspaceHeaders }>(
    "/recurring-rules",
    {
      schema: {
        operationId: "listRecurringRules",
        tags: ["Recurrences"],
        headers: workspaceHeadersSchema,
        querystring: planningListQuerySchema,
        response: { 200: recurringRuleListResponseSchema, ...errors },
      },
    },
    (request) => recurringControllers.list.handle(request),
  );
  app.post<{ Body: RecurringInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/recurring-rules",
    {
      onRequest: csrf,
      schema: {
        operationId: "createRecurringRule",
        tags: ["Recurrences"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: recurringInputSchema,
        response: { 201: recurringRuleResponseSchema, ...errors },
      },
    },
    (request, reply) => recurringControllers.create.handle(request, reply),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/recurring-rules/:id/pause",
    {
      onRequest: csrf,
      schema: {
        operationId: "pauseRecurringRule",
        tags: ["Recurrences"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: recurringToggleResponseSchema, ...errors },
      },
    },
    (request) => recurringControllers.pause.handle(request),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/recurring-rules/:id/resume",
    {
      onRequest: csrf,
      schema: {
        operationId: "resumeRecurringRule",
        tags: ["Recurrences"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: recurringToggleResponseSchema, ...errors },
      },
    },
    (request) => recurringControllers.resume.handle(request),
  );
  app.patch<{ Params: ResourceIdParams; Body: RecurringPatch; Headers: WorkspaceMutationHeaders }>(
    "/recurring-rules/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateRecurringRule",
        tags: ["Recurrences"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: recurringPatchSchema,
        response: { 200: recurringRuleResponseSchema, ...errors },
      },
    },
    (request) => recurringControllers.update.handle(request),
  );
  app.delete<{
    Params: ResourceIdParams;
    Body: DeleteRecurringInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/recurring-rules/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteRecurringRule",
        tags: ["Recurrences"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: deleteRecurringInputSchema,
        response: { 200: recurringDeleteResponseSchema, ...errors },
      },
    },
    (request) => recurringControllers.remove.handle(request),
  );
  return Promise.resolve();
};
