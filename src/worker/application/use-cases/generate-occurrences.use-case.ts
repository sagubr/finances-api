import { nextRecurrenceDate } from "#/modules/planning/domain/recurrence.js";
import type { JobRecord } from "#/modules/platform/application/ports/job.repository.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type { IWorkerUnitOfWork } from "#/worker/application/ports/worker.unit-of-work.js";
import { requirePayloadId } from "#/worker/job.types.js";

export class GenerateOccurrencesUseCase implements IJobHandler {
  readonly name = "generate-occurrences";

  constructor(
    private readonly unitOfWork: IWorkerUnitOfWork,
    private readonly generateId: () => string,
  ) {}

  execute(job: JobRecord): Promise<void> {
    if (!job.workspaceId) throw new Error("Tenant job is missing workspace context.");
    const ruleId = requirePayloadId(job.payload, "ruleId");
    const referenceOn = requirePayloadId(job.payload, "referenceOn");
    return this.unitOfWork.run(job.workspaceId, async ({ planning }) => {
      const rule = await planning.findRule(ruleId);
      if (!rule) return;
      const horizonDate = new Date(`${referenceOn}T00:00:00.000Z`);
      horizonDate.setUTCDate(horizonDate.getUTCDate() + 60);
      const horizon = horizonDate.toISOString().slice(0, 10);
      let logicalDate = rule.nextOccurrenceOn;
      let generated = 0;
      while (logicalDate <= horizon && (!rule.endsOn || logicalDate <= rule.endsOn)) {
        const occurrenceId = await planning.createOccurrence(
          this.generateId(),
          rule.id,
          logicalDate,
        );
        if (occurrenceId) {
          const transactionId = await planning.createPlannedTransaction(
            this.generateId(),
            rule,
            logicalDate,
          );
          if (transactionId) {
            await planning.linkOccurrence(occurrenceId, transactionId);
            generated++;
          }
        }
        logicalDate = nextRecurrenceDate(
          logicalDate,
          rule.frequency,
          rule.interval,
          rule.dayOfMonth ?? undefined,
        );
      }
      await planning.advanceRule(rule.id, logicalDate);
      if (generated === 0) return;
      await planning.writeEvent({
        eventId: this.generateId(),
        name: "OccurrencesGenerated",
        aggregateType: "recurring_rule",
        aggregateId: rule.publicId,
        aggregateVersion: 1,
        correlationId: this.generateId(),
        payload: { ruleId: rule.publicId, generated, through: horizon },
      });
    });
  }
}
