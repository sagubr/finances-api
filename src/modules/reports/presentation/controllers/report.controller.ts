import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import type { CompareReportUseCase } from "#/modules/reports/application/use-cases/compare-report.use-case.js";
import type { CreateDownloadTokenUseCase } from "#/modules/reports/application/use-cases/create-download-token.use-case.js";
import type { CreateExportUseCase } from "#/modules/reports/application/use-cases/create-export.use-case.js";
import type { DownloadExportUseCase } from "#/modules/reports/application/use-cases/download-export.use-case.js";
import type { GetAnnualReportUseCase } from "#/modules/reports/application/use-cases/get-annual-report.use-case.js";
import type { GetCashflowForecastUseCase } from "#/modules/reports/application/use-cases/get-cashflow-forecast.use-case.js";
import type { GetCategorySpendingUseCase } from "#/modules/reports/application/use-cases/get-category-spending.use-case.js";
import type { GetExportUseCase } from "#/modules/reports/application/use-cases/get-export.use-case.js";
import type { GetMonthlyCalendarUseCase } from "#/modules/reports/application/use-cases/get-monthly-calendar.use-case.js";
import type {
  AnnualReportQuery,
  CashflowRange,
  CategorySpendingQuery,
  CompareReportQuery,
  DownloadExportInput,
  ExportIdParams,
  ExportInput,
  MonthlyCalendarQuery,
} from "#/modules/reports/dtos/report.dto.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export class GetAnnualReportController {
  constructor(private readonly useCase: GetAnnualReportUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: AnnualReportQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query.year),
    );
  }
}
export class CompareReportController {
  constructor(private readonly useCase: CompareReportUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: CompareReportQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class GetCashflowForecastController {
  constructor(private readonly useCase: GetCashflowForecastUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: CashflowRange }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class GetCategorySpendingController {
  constructor(private readonly useCase: GetCategorySpendingUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: CategorySpendingQuery }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.query.month,
      ),
    );
  }
}
export class GetMonthlyCalendarController {
  constructor(private readonly useCase: GetMonthlyCalendarUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: MonthlyCalendarQuery }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.query.month,
      ),
    );
  }
}
export class CreateExportController {
  constructor(private readonly useCase: CreateExportUseCase) {}
  async handle(request: FastifyRequest<{ Body: ExportInput }>, reply: FastifyReply) {
    return reply
      .status(202)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class GetExportController {
  constructor(private readonly useCase: GetExportUseCase) {}
  async handle(request: FastifyRequest<{ Params: ExportIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class CreateDownloadTokenController {
  constructor(private readonly useCase: CreateDownloadTokenUseCase) {}
  async handle(request: FastifyRequest<{ Params: ExportIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class DownloadExportController {
  constructor(private readonly useCase: DownloadExportUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: ExportIdParams; Body: DownloadExportInput }>,
    reply: FastifyReply,
  ) {
    const artifact = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body.token,
    );
    return reply
      .type(artifact.contentType)
      .header("content-disposition", `attachment; filename="${artifact.fileName}"`)
      .send(artifact.content);
  }
}
