import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportRepository } from "./report.repository.js";

export type ReportWorkContext = Readonly<{ reports: IReportRepository }>;
export interface IReportUnitOfWork {
  run<T>(context: RequestContext, work: (scope: ReportWorkContext) => Promise<T>): Promise<T>;
}
