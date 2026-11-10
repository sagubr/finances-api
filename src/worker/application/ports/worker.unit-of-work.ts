import type { IPlanningJobRepository } from "#/modules/planning/application/ports/planning-job.repository.js";
import type { IScheduledJobRepository } from "#/modules/platform/application/ports/job.repository.js";
import type { ITransactionJobRepository } from "#/modules/transactions/application/ports/transaction-job.repository.js";

export type WorkerScope = Readonly<{
  planning: IPlanningJobRepository;
  transactions: ITransactionJobRepository;
  scheduledJobs: IScheduledJobRepository;
}>;

export interface IWorkerUnitOfWork {
  run<T>(workspaceId: bigint, work: (scope: WorkerScope) => Promise<T>): Promise<T>;
}
