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
  instrumentListResponseSchema,
  instrumentQuerySchema,
  instrumentSchema,
  orderInputSchema,
  orderListResponseSchema,
  orderMutationResponseSchema,
  orderPatchSchema,
  orderResponseSchema,
  positionListQuerySchema,
  positionListResponseSchema,
  quoteResponseSchema,
  resolveInstrumentInputSchema,
  versionInputSchema,
  wealthIdParamsSchema,
  wealthListQuerySchema,
  type InstrumentQuery,
  type OrderInput,
  type OrderPatch,
  type ResolveInstrumentInput,
  type VersionInput,
  type WealthIdParams,
  type WealthListQuery,
} from "#/modules/wealth/dtos/wealth.dto.js";
import { wealthControllers } from "#/modules/wealth/factories/wealth.factory.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export type InvestmentRoutesOptions = Readonly<{
  requestContextResolver: IRequestContextResolver;
}>;
const success = <T extends z.ZodType>(data: T) => z.object({ success: z.literal(true), data });
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  429: apiErrorResponseSchema,
  503: apiErrorResponseSchema,
} as const;

export const investmentRoutes: FastifyPluginAsyncZod<InvestmentRoutesOptions> = (app, options) => {
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
  app.post<{ Body: ResolveInstrumentInput; Headers: WorkspaceMutationHeaders }>(
    "/instruments/resolve",
    {
      onRequest: csrf,
      schema: {
        operationId: "resolveInstrument",
        tags: ["Market Data"],
        headers: workspaceMutationHeadersSchema,
        body: resolveInstrumentInputSchema,
        response: { 201: success(instrumentSchema), ...errors },
      },
    },
    (request, reply) => wealthControllers.resolveInstrument.handle(request, reply),
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
  return Promise.resolve();
};
