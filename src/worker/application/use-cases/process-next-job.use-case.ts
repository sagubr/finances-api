import type { IJobRepository } from "#/modules/platform/application/ports/job.repository.js";
import { toSafeErrorLog } from "#/shared/observability/safe-error-log.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";

export class ProcessNextJobUseCase {
  private readonly handlers: ReadonlyMap<string, IJobHandler>;

  constructor(
    private readonly jobs: IJobRepository,
    handlers: readonly IJobHandler[],
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.name, handler]));
  }

  async execute(): Promise<boolean> {
    const job = await this.jobs.claim();
    if (!job) return false;
    try {
      const handler = this.handlers.get(job.name);
      if (!handler) throw new Error(`No handler registered for ${job.name}.`);
      await handler.execute(job);
      await this.jobs.complete(job.id);
      return true;
    } catch (error: unknown) {
      const diagnostic = toSafeErrorLog(error);
      await this.jobs.fail(job.id, job.attempts, diagnostic.code ?? diagnostic.name);
      throw error;
    }
  }
}
