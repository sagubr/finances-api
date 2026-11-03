import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";
import type { CashflowRange } from "#/modules/reports/dtos/report.dto.js";

export class GetCashflowForecastUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, input: CashflowRange) {
    return this.unitOfWork.run(context, ({ reports }) =>
      reports.cashflow(input, this.now().toISOString()),
    );
  }
}
