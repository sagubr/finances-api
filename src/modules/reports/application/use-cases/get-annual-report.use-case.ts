import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";

export class GetAnnualReportUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, year = this.now().getUTCFullYear()) {
    return this.unitOfWork.run(context, ({ reports }) =>
      reports.annual(year, this.now().toISOString()),
    );
  }
}
