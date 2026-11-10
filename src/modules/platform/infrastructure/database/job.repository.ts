import type { Database } from "#/infrastructure/database/db.provider.js";
import type {
  IJobRepository,
  JobRecord,
} from "#/modules/platform/application/ports/job.repository.js";
import { jobRuns } from "#/modules/platform/infrastructure/database/platform.schema.js";
import { and, asc, eq, lte, sql } from "drizzle-orm";

export class JobRepository implements IJobRepository {
  constructor(private readonly database: Database) {}

  claim(): Promise<JobRecord | null> {
    return this.database.transaction(async (transaction) => {
      const job = (
        await transaction
          .select()
          .from(jobRuns)
          .where(and(eq(jobRuns.status, "PENDING"), lte(jobRuns.availableAt, new Date())))
          .orderBy(asc(jobRuns.availableAt), asc(jobRuns.id))
          .limit(1)
          .for("update", { skipLocked: true })
      )[0];
      if (!job) return null;
      await transaction
        .update(jobRuns)
        .set({
          status: "RUNNING",
          startedAt: new Date(),
          attempts: sql`${jobRuns.attempts} + 1`,
        })
        .where(eq(jobRuns.id, job.id));
      return {
        id: job.id,
        publicId: job.publicId,
        workspaceId: job.workspaceId,
        name: job.jobName,
        payload: job.payload,
        attempts: job.attempts + 1,
      };
    });
  }

  async complete(id: bigint): Promise<void> {
    await this.database
      .update(jobRuns)
      .set({
        status: "SUCCEEDED",
        progress: { percent: 100 },
        errorCode: null,
        finishedAt: new Date(),
      })
      .where(eq(jobRuns.id, id));
  }

  async fail(id: bigint, attempts: number, errorCode: string): Promise<void> {
    const dead = attempts >= 5;
    const delaySeconds = Math.min(300, 2 ** attempts);
    await this.database
      .update(jobRuns)
      .set({
        status: dead ? "DEAD" : "PENDING",
        errorCode,
        availableAt: new Date(Date.now() + delaySeconds * 1_000),
        finishedAt: dead ? new Date() : null,
      })
      .where(eq(jobRuns.id, id));
  }
}
