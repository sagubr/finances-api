import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";

export class GetMonthlyCalendarUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly now: () => Date,
  ) {}

  execute(context: RequestContext, month: string) {
    return this.unitOfWork.run(context, ({ reports }) =>
      reports.monthlyCalendar(month, this.now().toISOString()),
    );
  }
}
