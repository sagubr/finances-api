import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import type { JobRecord } from "#/modules/platform/application/ports/job.repository.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type { IWorkerUnitOfWork } from "#/worker/application/ports/worker.unit-of-work.js";

const cleanupBatchSize = 1_000;

export class CleanExpiredImportFilesUseCase implements IJobHandler {
  readonly name = "clean-expired-import-files";

  constructor(
    private readonly unitOfWork: IWorkerUnitOfWork,
    private readonly storage: IImportStorage,
    private readonly now: () => Date,
  ) {}

  execute(job: JobRecord): Promise<void> {
    if (!job.workspaceId) throw new Error("Tenant job is missing workspace context.");
    return this.unitOfWork.run(job.workspaceId, async ({ planning }) => {
      const files = await planning.listExpiredImportFiles(this.now(), cleanupBatchSize);
      for (const file of files) {
        await this.storage.remove(file.storageKey);
        await planning.markImportFileRemoved(file.id);
      }
    });
  }
}
