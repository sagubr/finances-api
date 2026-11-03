import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import {
  commitImportInputSchema,
  importBatchResponseSchema,
  importCommitResponseSchema,
  importIdParamsSchema,
  importPreviewResponseSchema,
  importRollbackResponseSchema,
  importRowCorrectionSchema,
  importRowParamsSchema,
  importRowResponseSchema,
  importRowsQuerySchema,
  importRowsResponseSchema,
  importTemplateResponseSchema,
  type CommitImportInput,
  type ImportIdParams,
  type ImportRowCorrection,
  type ImportRowParams,
  type ImportRowsQuery,
} from "#/modules/planning/dtos/import.dto.js";
import { importControllers } from "#/modules/planning/factories/import.factory.js";
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

export type ImportRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  429: apiErrorResponseSchema,
} as const;

export const importRoutes: FastifyPluginAsyncZod<ImportRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.post<{ Headers: WorkspaceMutationHeaders }>(
    "/imports",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
      schema: {
        operationId: "createImportPreview",
        tags: ["Imports"],
        headers: workspaceMutationHeadersSchema,
        consumes: ["multipart/form-data"],
        response: { 202: importPreviewResponseSchema, ...errors },
      },
    },
    (request, reply) => importControllers.create.handle(request, reply),
  );
  app.get<{ Params: ImportIdParams; Headers: WorkspaceHeaders }>(
    "/imports/:id",
    {
      schema: {
        operationId: "getImportBatch",
        tags: ["Imports"],
        headers: workspaceHeadersSchema,
        params: importIdParamsSchema,
        response: { 200: importBatchResponseSchema, ...errors },
      },
    },
    (request) => importControllers.get.handle(request),
  );
  app.get<{
    Params: ImportIdParams;
    Querystring: ImportRowsQuery;
    Headers: WorkspaceHeaders;
  }>(
    "/imports/:id/rows",
    {
      schema: {
        operationId: "listImportRows",
        tags: ["Imports"],
        headers: workspaceHeadersSchema,
        params: importIdParamsSchema,
        querystring: importRowsQuerySchema,
        response: { 200: importRowsResponseSchema, ...errors },
      },
    },
    (request) => importControllers.listRows.handle(request),
  );
  app.patch<{
    Params: ImportRowParams;
    Body: ImportRowCorrection;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/imports/:id/rows/:rowId",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateImportRow",
        tags: ["Imports"],
        headers: workspaceMutationHeadersSchema,
        params: importRowParamsSchema,
        body: importRowCorrectionSchema,
        response: { 200: importRowResponseSchema, ...errors },
      },
    },
    (request) => importControllers.updateRow.handle(request),
  );
  app.post<{
    Params: ImportIdParams;
    Body: CommitImportInput;
    Headers: WorkspaceIdempotencyMutationHeaders;
  }>(
    "/imports/:id/commit",
    {
      onRequest: csrf,
      schema: {
        operationId: "commitImport",
        tags: ["Imports"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        params: importIdParamsSchema,
        body: commitImportInputSchema,
        response: { 201: importCommitResponseSchema, ...errors },
      },
    },
    (request, reply) => importControllers.commit.handle(request, reply),
  );
  app.post<{ Params: ImportIdParams; Headers: WorkspaceMutationHeaders }>(
    "/imports/:id/rollback",
    {
      onRequest: csrf,
      schema: {
        operationId: "rollbackImport",
        tags: ["Imports"],
        headers: workspaceMutationHeadersSchema,
        params: importIdParamsSchema,
        response: { 200: importRollbackResponseSchema, ...errors },
      },
    },
    (request) => importControllers.rollback.handle(request),
  );
  app.get<{ Headers: WorkspaceHeaders }>(
    "/imports/template",
    {
      schema: {
        operationId: "downloadImportTemplate",
        tags: ["Imports"],
        headers: workspaceHeadersSchema,
        response: { 200: importTemplateResponseSchema },
      },
    },
    (_request, reply) => importControllers.template.handle(reply),
  );
  return Promise.resolve();
};
