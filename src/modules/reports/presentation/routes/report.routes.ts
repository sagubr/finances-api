import { createRequestContextMiddleware } from "#/middlewares/request-context.middleware.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import {
  workspaceHeadersSchema,
  type WorkspaceHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import {
  annualReportQuerySchema,
  annualReportResponseSchema,
  cashflowForecastResponseSchema,
  cashflowRangeSchema,
  categorySpendingQuerySchema,
  categorySpendingResponseSchema,
  compareReportQuerySchema,
  comparisonReportResponseSchema,
  monthlyCalendarQuerySchema,
  monthlyCalendarResponseSchema,
  type AnnualReportQuery,
  type CashflowRange,
  type CategorySpendingQuery,
  type CompareReportQuery,
  type MonthlyCalendarQuery,
} from "#/modules/reports/dtos/report.dto.js";
import { reportControllers } from "#/modules/reports/factories/report.factory.js";
import { apiErrorResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export type ReportRoutesOptions = Readonly<{ requestContextResolver: IRequestContextResolver }>;
const errors = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
} as const;
export const reportRoutes: FastifyPluginAsyncZod<ReportRoutesOptions> = (app, options) => {
  app.addHook("preHandler", createRequestContextMiddleware(options.requestContextResolver));
  app.get<{ Querystring: AnnualReportQuery; Headers: WorkspaceHeaders }>(
    "/reports/annual",
    {
      schema: {
        operationId: "getAnnualReport",
        tags: ["Reports"],
        headers: workspaceHeadersSchema,
        querystring: annualReportQuerySchema,
        response: { 200: annualReportResponseSchema, ...errors },
      },
    },
    (request) => reportControllers.annual.handle(request),
  );
  app.get<{ Querystring: CompareReportQuery; Headers: WorkspaceHeaders }>(
    "/reports/compare",
    {
      schema: {
        operationId: "compareReports",
        tags: ["Reports"],
        headers: workspaceHeadersSchema,
        querystring: compareReportQuerySchema,
        response: { 200: comparisonReportResponseSchema, ...errors },
      },
    },
    (request) => reportControllers.compare.handle(request),
  );
  app.get<{ Querystring: CashflowRange; Headers: WorkspaceHeaders }>(
    "/reports/cashflow-forecast",
    {
      schema: {
        operationId: "getCashflowForecast",
        tags: ["Reports"],
        headers: workspaceHeadersSchema,
        querystring: cashflowRangeSchema,
        response: { 200: cashflowForecastResponseSchema, ...errors },
      },
    },
    (request) => reportControllers.cashflow.handle(request),
  );
  app.get<{ Querystring: CategorySpendingQuery; Headers: WorkspaceHeaders }>(
    "/reports/category-spending",
    {
      schema: {
        operationId: "getCategorySpending",
        tags: ["Reports"],
        headers: workspaceHeadersSchema,
        querystring: categorySpendingQuerySchema,
        response: { 200: categorySpendingResponseSchema, ...errors },
      },
    },
    (request) => reportControllers.categorySpending.handle(request),
  );
  app.get<{ Querystring: MonthlyCalendarQuery; Headers: WorkspaceHeaders }>(
    "/reports/monthly-calendar",
    {
      schema: {
        operationId: "getMonthlyCalendar",
        tags: ["Reports"],
        headers: workspaceHeadersSchema,
        querystring: monthlyCalendarQuerySchema,
        response: { 200: monthlyCalendarResponseSchema, ...errors },
      },
    },
    (request) => reportControllers.monthlyCalendar.handle(request),
  );
  return Promise.resolve();
};
