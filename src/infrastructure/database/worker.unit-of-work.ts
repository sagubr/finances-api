import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import { PlanningJobRepository } from "#/modules/planning/infrastructure/database/planning-job.repository.js";
import { ScheduledJobRepository } from "#/modules/platform/infrastructure/database/scheduled-job.repository.js";
import { TransactionJobRepository } from "#/modules/transactions/infrastructure/database/transaction-job.repository.js";
import type {
  IWorkerUnitOfWork,
  WorkerScope,
} from "#/worker/application/ports/worker.unit-of-work.js";
import { v7 as uuidv7 } from "uuid";

export class WorkerUnitOfWork implements IWorkerUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;

  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }

  run<T>(workspaceId: bigint, work: (scope: WorkerScope) => Promise<T>): Promise<T> {
    return this.tenantUnitOfWork.run({ workspaceId }, (database) =>
      work({
        planning: new PlanningJobRepository(database, workspaceId, uuidv7),
        transactions: new TransactionJobRepository(database, workspaceId, uuidv7),
        scheduledJobs: new ScheduledJobRepository(database),
      }),
    );
  }
}
