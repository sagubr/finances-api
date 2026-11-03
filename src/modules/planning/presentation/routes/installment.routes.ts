import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  installmentPatchSchema,
  installmentPlanListResponseSchema,
  installmentPlanResponseSchema,
  installmentPlanSummarySchema,
  installmentQuerySchema,
  installmentsInputSchema,
  resourceIdParamsSchema,
  versionInputSchema,
  type InstallmentPatch,
  type InstallmentQuery,
  type InstallmentsInput,
  type ResourceIdParams,
  type VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { installmentControllers } from "#/modules/planning/factories/installment.factory.js";
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
import { z } from "zod";
export type InstallmentRoutesOptions = Readonly<{
  requestContextResolver: IRequestContextResolver;
}>;
export const installmentRoutes: FastifyPluginAsyncZod<InstallmentRoutesOptions> = (
  app,
  options,
) => {
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: InstallmentQuery; Headers: WorkspaceHeaders }>(
    "/installment-plans",
    {
      schema: {
        operationId: "listInstallmentPlans",
        tags: ["Installments"],
        headers: workspaceHeadersSchema,
        querystring: installmentQuerySchema,
        response: {
          200: installmentPlanListResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
        },
      },
    },
    (request) => installmentControllers.list.handle(request),
  );
  app.post<{ Body: InstallmentsInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/installment-plans",
    {
      onRequest: app.csrfProtection.bind(app),
      schema: {
        operationId: "createInstallmentPlan",
        tags: ["Installments"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: installmentsInputSchema,
        response: {
          201: installmentPlanResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => installmentControllers.create.handle(request, reply),
  );
  app.patch<{
    Params: ResourceIdParams;
    Body: InstallmentPatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/installment-plans/:id",
    {
      onRequest: app.csrfProtection.bind(app),
      schema: {
        operationId: "updateInstallmentPlan",
        tags: ["Installments"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: installmentPatchSchema,
        response: {
          200: z.object({ success: z.literal(true), data: installmentPlanSummarySchema }),
          409: apiErrorResponseSchema,
        },
      },
    },
    (request) => installmentControllers.update.handle(request),
  );
  app.delete<{
    Params: ResourceIdParams;
    Body: VersionInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/installment-plans/:id",
    {
      onRequest: app.csrfProtection.bind(app),
      schema: {
        operationId: "deleteInstallmentPlan",
        tags: ["Installments"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, 409: apiErrorResponseSchema },
      },
    },
    (request, reply) => installmentControllers.delete.handle(request, reply),
  );
  return Promise.resolve();
};
