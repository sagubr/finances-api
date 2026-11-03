import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export class GetExportUseCase {
  constructor(private readonly unitOfWork: IReportUnitOfWork) {}
  async execute(context: RequestContext, id: string) {
    const item = await this.unitOfWork.run(context, ({ reports }) => reports.findExport(id));
    if (!item)
      throw new ApplicationError("Export não encontrado.", {
        category: "not-found",
        code: "EXPORT_NOT_FOUND",
      });
    return item;
  }
}
