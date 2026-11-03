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
  assetInputSchema,
  assetListResponseSchema,
  assetPatchSchema,
  assetResponseSchema,
  assetValuationInputSchema,
  assetValuationResponseSchema,
  instrumentListResponseSchema,
  instrumentQuerySchema,
  investmentAccountListResponseSchema,
  netWorthResponseSchema,
  orderInputSchema,
  orderListResponseSchema,
  orderMutationResponseSchema,
  orderPatchSchema,
  orderResponseSchema,
  payrollCalculationInputSchema,
  positionListQuerySchema,
  positionListResponseSchema,
  quoteResponseSchema,
  versionInputSchema,
  wealthDateQuerySchema,
  wealthIdParamsSchema,
  wealthListQuerySchema,
  type AssetInput,
  type AssetPatch,
  type AssetValuationInput,
  type InstrumentQuery,
  type OrderInput,
  type OrderPatch,
  type VersionInput,
  type WealthDateQuery,
  type WealthIdParams,
  type WealthListQuery,
} from "#/modules/wealth/dtos/wealth.dto.js";
import { wealthControllers } from "#/modules/wealth/factories/wealth.factory.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type WealthRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  503: apiErrorResponseSchema,
} as const;
export const wealthRoutes: FastifyPluginAsyncZod<WealthRoutesOptions> = (app, options) => {
  const csrf = app.csrfProtection.bind(app);
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: InstrumentQuery; Headers: WorkspaceHeaders }>(
    "/instruments",
    {
      schema: {
        operationId: "listInstruments",
        tags: ["Market Data"],
        headers: workspaceHeadersSchema,
        querystring: instrumentQuerySchema,
        response: { 200: instrumentListResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.instruments.handle(request),
  );
  app.get<{ Params: WealthIdParams; Headers: WorkspaceHeaders }>(
    "/instruments/:id/quote",
    {
      schema: {
        operationId: "getInstrumentQuote",
        tags: ["Market Data"],
        headers: workspaceHeadersSchema,
        params: wealthIdParamsSchema,
        response: { 200: quoteResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.quote.handle(request),
  );
  app.get<{ Querystring: WealthListQuery; Headers: WorkspaceHeaders }>(
    "/investments/accounts",
    {
      schema: {
        operationId: "listInvestmentAccounts",
        tags: ["Investments"],
        headers: workspaceHeadersSchema,
        querystring: wealthListQuerySchema,
        response: { 200: investmentAccountListResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.investmentAccounts.handle(request),
  );
  app.get<{ Querystring: WealthListQuery; Headers: WorkspaceHeaders }>(
    "/investments/orders",
    {
      schema: {
        operationId: "listInvestmentOrders",
        tags: ["Investments"],
        headers: workspaceHeadersSchema,
        querystring: wealthListQuerySchema,
        response: { 200: orderListResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.orders.handle(request),
  );
  app.get<{ Querystring: WealthListQuery; Headers: WorkspaceHeaders }>(
    "/investments/positions",
    {
      schema: {
        operationId: "listInvestmentPositions",
        tags: ["Investments"],
        headers: workspaceHeadersSchema,
        querystring: positionListQuerySchema,
        response: { 200: positionListResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.positions.handle(request),
  );
  app.post<{ Body: OrderInput; Headers: WorkspaceIdempotencyMutationHeaders }>(
    "/investments/orders",
    {
      onRequest: csrf,
      schema: {
        operationId: "createInvestmentOrder",
        tags: ["Investments"],
        headers: workspaceIdempotencyMutationHeadersSchema,
        body: orderInputSchema,
        response: { 201: orderResponseSchema, ...errors },
      },
    },
    (request, reply) => wealthControllers.createOrder.handle(request, reply),
  );
  app.patch<{ Params: WealthIdParams; Body: OrderPatch; Headers: WorkspaceMutationHeaders }>(
    "/investments/orders/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateInvestmentOrder",
        tags: ["Investments"],
        headers: workspaceMutationHeadersSchema,
        params: wealthIdParamsSchema,
        body: orderPatchSchema,
        response: { 200: orderMutationResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.updateOrder.handle(request),
  );
  app.delete<{ Params: WealthIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/investments/orders/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteInvestmentOrder",
        tags: ["Investments"],
        headers: workspaceMutationHeadersSchema,
        params: wealthIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => wealthControllers.deleteOrder.handle(request, reply),
  );
  app.get<{ Querystring: WealthListQuery; Headers: WorkspaceHeaders }>(
    "/assets",
    {
      schema: {
        operationId: "listAssets",
        tags: ["Assets"],
        headers: workspaceHeadersSchema,
        querystring: wealthListQuerySchema,
        response: { 200: assetListResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.assets.handle(request),
  );
  app.post<{ Body: AssetInput; Headers: WorkspaceMutationHeaders }>(
    "/assets",
    {
      onRequest: csrf,
      schema: {
        operationId: "createAsset",
        tags: ["Assets"],
        headers: workspaceMutationHeadersSchema,
        body: assetInputSchema,
        response: { 201: assetResponseSchema, ...errors },
      },
    },
    (request, reply) => wealthControllers.createAsset.handle(request, reply),
  );
  app.patch<{ Params: WealthIdParams; Body: AssetPatch; Headers: WorkspaceMutationHeaders }>(
    "/assets/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "updateAsset",
        tags: ["Assets"],
        headers: workspaceMutationHeadersSchema,
        params: wealthIdParamsSchema,
        body: assetPatchSchema,
        response: { 200: assetResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.updateAsset.handle(request),
  );
  app.delete<{ Params: WealthIdParams; Body: VersionInput; Headers: WorkspaceMutationHeaders }>(
    "/assets/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "deleteAsset",
        tags: ["Assets"],
        headers: workspaceMutationHeadersSchema,
        params: wealthIdParamsSchema,
        body: versionInputSchema,
        response: { 204: noContentResponseSchema, ...errors },
      },
    },
    (request, reply) => wealthControllers.deleteAsset.handle(request, reply),
  );
  app.post<{
    Params: WealthIdParams;
    Body: AssetValuationInput;
    Headers: WorkspaceMutationHeaders;
  }>(
    "/assets/:id/valuation",
    {
      onRequest: csrf,
      schema: {
        operationId: "createAssetValuation",
        tags: ["Assets"],
        headers: workspaceMutationHeadersSchema,
        params: wealthIdParamsSchema,
        body: assetValuationInputSchema,
        response: { 201: assetValuationResponseSchema, ...errors },
      },
    },
    (request, reply) => wealthControllers.createAssetValuation.handle(request, reply),
  );
  app.get<{ Querystring: WealthDateQuery; Headers: WorkspaceHeaders }>(
    "/net-worth",
    {
      schema: {
        operationId: "getNetWorth",
        tags: ["Assets"],
        headers: workspaceHeadersSchema,
        querystring: wealthDateQuerySchema,
        response: { 200: netWorthResponseSchema, ...errors },
      },
    },
    (request) => wealthControllers.netWorth.handle(request),
  );
  for (const [path, operationId] of [
    ["/payroll/net-salary", "calculateNetSalary"],
    ["/payroll/fgts-projection", "calculateFgtsProjection"],
    ["/payroll/severance", "calculateSeverance"],
  ] as const)
    app.post(
      path,
      {
        onRequest: csrf,
        schema: {
          hide: true,
          operationId,
          tags: ["Payroll"],
          headers: workspaceMutationHeadersSchema,
          body: payrollCalculationInputSchema,
          response: errors,
        },
      },
      (request) => wealthControllers.payroll.handle(request),
    );
  return Promise.resolve();
};
