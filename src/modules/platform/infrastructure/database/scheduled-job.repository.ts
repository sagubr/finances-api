import type { Database } from "#/infrastructure/database/db.provider.js";
import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  IScheduledJobRepository,
  ScheduledJob,
} from "#/modules/platform/application/ports/job.repository.js";
import { jobRuns } from "#/modules/platform/infrastructure/database/platform.schema.js";

export class ScheduledJobRepository implements IScheduledJobRepository {
  constructor(private readonly database: Database | TenantDatabase) {}

  async schedule(jobs: readonly ScheduledJob[]): Promise<void> {
    if (jobs.length === 0) return;
    await this.database
      .insert(jobRuns)
      .values(
        jobs.map((job) => ({
          publicId: job.publicId,
          workspaceId: job.workspaceId,
          jobName: job.name,
          jobVersion: 1,
          executionKey: job.executionKey,
          payload: job.payload,
        })),
      )
      .onConflictDoNothing({ target: jobRuns.executionKey });
  }
}
