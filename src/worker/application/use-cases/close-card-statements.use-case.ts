import type { JobRecord } from "#/modules/platform/application/ports/job.repository.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type { IWorkerUnitOfWork } from "#/worker/application/ports/worker.unit-of-work.js";
import { requirePayloadId } from "#/worker/job.types.js";

export class CloseCardStatementsUseCase implements IJobHandler {
  readonly name = "close-card-statements";

  constructor(
    private readonly unitOfWork: IWorkerUnitOfWork,
    private readonly generateId: () => string,
  ) {}

  execute(job: JobRecord): Promise<void> {
    if (!job.workspaceId) throw new Error("Tenant job is missing workspace context.");
    const referenceOn = requirePayloadId(job.payload, "referenceOn");
    return this.unitOfWork.run(job.workspaceId, async ({ planning }) => {
      const statements = await planning.closeDueStatements(referenceOn);
      for (const statement of statements)
        await planning.writeEvent({
          eventId: this.generateId(),
          name: "StatementClosed",
          aggregateType: "statement",
          aggregateId: statement.publicId,
          aggregateVersion: statement.version,
          correlationId: this.generateId(),
          payload: {
            id: statement.publicId,
            totalCents: Number(statement.totalCents),
            closedBy: "scheduled-job",
            version: statement.version,
          },
        });
    });
  }
}
