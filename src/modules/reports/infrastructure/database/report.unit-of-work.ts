import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type {
  IReportUnitOfWork,
  ReportWorkContext,
} from "#/modules/reports/application/ports/report.unit-of-work.js";
import { ReportRepository } from "./report.repository.js";

export class ReportUnitOfWork implements IReportUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;
  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }
  run<T>(context: RequestContext, work: (scope: ReportWorkContext) => Promise<T>): Promise<T> {
    return this.tenantUnitOfWork.run(
      { workspaceId: context.workspaceId, actorId: context.userId },
      (database) => work({ reports: new ReportRepository(database, context) }),
    );
  }
}
