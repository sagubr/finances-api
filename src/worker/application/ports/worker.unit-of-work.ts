import type { IPlanningJobRepository } from "#/modules/planning/application/ports/planning-job.repository.js";
import type { IScheduledJobRepository } from "#/modules/platform/application/ports/job.repository.js";

export type WorkerScope = Readonly<{
  planning: IPlanningJobRepository;
  scheduledJobs: IScheduledJobRepository;
}>;

export interface IWorkerUnitOfWork {
  run<T>(workspaceId: bigint, work: (scope: WorkerScope) => Promise<T>): Promise<T>;
}
