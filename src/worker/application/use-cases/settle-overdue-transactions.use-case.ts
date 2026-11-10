import type { JobRecord } from "#/modules/platform/application/ports/job.repository.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type { IWorkerUnitOfWork } from "#/worker/application/ports/worker.unit-of-work.js";
import { requirePayloadId } from "#/worker/job.types.js";

export class SettleOverdueTransactionsUseCase implements IJobHandler {
  readonly name = "settle-overdue-transactions";

  constructor(private readonly unitOfWork: IWorkerUnitOfWork) {}

  execute(job: JobRecord): Promise<void> {
    if (!job.workspaceId) throw new Error("Tenant job is missing workspace context.");
    const referenceOn = requirePayloadId(job.payload, "referenceOn");
    return this.unitOfWork.run(job.workspaceId, async ({ transactions }) => {
      await transactions.settleOverdue(referenceOn);
    });
  }
}
