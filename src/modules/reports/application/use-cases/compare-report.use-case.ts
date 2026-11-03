import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";
import type { CompareReportQuery } from "#/modules/reports/dtos/report.dto.js";

export class CompareReportUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, input: CompareReportQuery) {
    return this.unitOfWork.run(context, ({ reports }) =>
      reports.compare(input, this.now().toISOString()),
    );
  }
}
