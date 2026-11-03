import type { JobRecord } from "#/modules/platform/application/ports/job.repository.js";

export interface IJobHandler {
  readonly name: string;
  execute(job: JobRecord): Promise<void>;
}
