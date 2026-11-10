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
  listTransactionsQuerySchema,
  monthlySummaryQuerySchema,
  monthlySummaryResponseSchema,
  resourceIdParamsSchema,
  transactionInputSchema,
  transactionListResponseSchema,
  transactionMapQuerySchema,
  transactionMapResponseSchema,
  transactionPatchSchema,
  transactionResponseSchema,
  transferInputSchema,
  transferResponseSchema,
  versionInputSchema,
  type ListTransactionsQuery,
  type ResourceIdParams,
  type TransactionInput,
  type TransactionMapQuery,
  type TransactionPatch,
  type TransferInput,
  type VersionInput,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { transactionControllers } from "#/modules/transactions/factories/transaction.factory.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type TransactionRoutesOptions = Readonly<{
  requestContextResolver: IRequestContextResolver;
}>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
} as const;

export const transactionRoutes: FastifyPluginAsyncZod<TransactionRoutesOptions> = (
  app,
  options,
) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: ListTransactionsQuery; Headers: WorkspaceHeaders }>(
    "/transactions",
    {
      schema: {
        operationId: "listTransactions",
        tags: ["Transactions"],
        headers: workspaceHeadersSchema,
        querystring: listTransactionsQuerySchema,
        response: { 200: transactionListResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.list.handle(request),
  );
  app.get<{ Querystring: TransactionMapQuery; Headers: WorkspaceHeaders }>(
    "/transactions/map",
    {
      schema: {
        operationId: "getTransactionMap",
        tags: ["Transactions"],
        headers: workspaceHeadersSchema,
        querystring: transactionMapQuerySchema,
        response: { 200: transactionMapResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.map.handle(request),
  );
  app.get<{ Params: ResourceIdParams; Headers: WorkspaceHeaders }>(
    "/transactions/:id",
    {
      schema: {
        operationId: "getTransaction",
        tags: ["Transactions"],
        headers: workspaceHeadersSchema,
        params: resourceIdParamsSchema,
        response: { 200: transactionResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.get.handle(request),
  );
  app.post<{ Body: TransactionInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/transactions",
    {
      onRequest: csrf,
      schema: {
        operationId: "createTransaction",
        tags: ["Transactions"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: transactionInputSchema,
        response: { 201: transactionResponseSchema, ...errors },
      },
    },
    (request, reply) => transactionControllers.create.handle(request, reply),
  );
  app.patch<{
    Params: ResourceIdParams;
    Body: TransactionPatch;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/transactions/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateTransaction",
        tags: ["Transactions"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: transactionPatchSchema,
        response: { 200: transactionResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.update.handle(request),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/transactions/:id/confirm",
    {
      onRequest: csrf,
      schema: {
        operationId: "confirmTransaction",
        tags: ["Transactions"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: transactionResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.confirm.handle(request),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/transactions/:id/settle",
    {
      onRequest: csrf,
      schema: {
        operationId: "settleTransaction",
        tags: ["Transactions"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: transactionResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.settle.handle(request),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/transactions/:id/revert-status",
    {
      onRequest: csrf,
      schema: {
        operationId: "revertTransactionStatus",
        tags: ["Transactions"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: transactionResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.revertStatus.handle(request),
  );
  app.delete<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/transactions/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteTransaction",
        tags: ["Transactions"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => transactionControllers.remove.handle(request, reply),
  );
  app.post<{ Params: ResourceIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/transactions/:id/restore",
    {
      onRequest: csrf,
      schema: {
        operationId: "restoreTransaction",
        tags: ["Transactions"],
        headers: workspaceMutationHeadersSchema,
        params: resourceIdParamsSchema,
        body: versionInputSchema,
        response: { 200: transactionResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.restore.handle(request),
  );
  app.post<{ Body: TransferInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/transfers",
    {
      onRequest: csrf,
      schema: {
        operationId: "createTransfer",
        tags: ["Transactions"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: transferInputSchema,
        response: { 201: transferResponseSchema, ...errors },
      },
    },
    (request, reply) => transactionControllers.transfer.handle(request, reply),
  );
  app.get<{ Querystring: { month: string }; Headers: WorkspaceHeaders }>(
    "/reports/monthly-summary",
    {
      schema: {
        operationId: "getMonthlySummary",
        tags: ["Reports"],
        headers: workspaceHeadersSchema,
        querystring: monthlySummaryQuerySchema,
        response: { 200: monthlySummaryResponseSchema, ...errors },
      },
    },
    (request) => transactionControllers.monthlySummary.handle(request),
  );
  return Promise.resolve();
};
