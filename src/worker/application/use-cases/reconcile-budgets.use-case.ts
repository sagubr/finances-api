import { reachedBudgetThresholds } from "#/modules/planning/domain/budget-thresholds.js";
import type { JobRecord } from "#/modules/platform/application/ports/job.repository.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type { IWorkerUnitOfWork } from "#/worker/application/ports/worker.unit-of-work.js";
import { requirePayloadId } from "#/worker/job.types.js";

export class ReconcileBudgetsUseCase implements IJobHandler {
  readonly name = "reconcile-budgets";

  constructor(
    private readonly unitOfWork: IWorkerUnitOfWork,
    private readonly generateId: () => string,
  ) {}

  execute(job: JobRecord): Promise<void> {
    if (!job.workspaceId) throw new Error("Tenant job is missing workspace context.");
    const month = requirePayloadId(job.payload, "month");
    return this.unitOfWork.run(job.workspaceId, async ({ planning }) => {
      const budgets = await planning.listBudgetConsumption(month);
      for (const budget of budgets) {
        const result = reachedBudgetThresholds(budget.realizedCents, budget.limitCents);
        if (result.consumptionBps === null) continue;
        for (const thresholdBps of result.thresholds) {
          const registered = await planning.registerBudgetThreshold(
            budget.id,
            thresholdBps,
            budget.version,
          );
          if (!registered) continue;
          await planning.writeEvent({
            eventId: this.generateId(),
            name: "BudgetThresholdReached",
            aggregateType: "budget",
            aggregateId: budget.publicId,
            aggregateVersion: budget.version,
            correlationId: this.generateId(),
            payload: {
              budgetId: budget.publicId,
              month,
              thresholdBps,
              consumptionBps: result.consumptionBps,
              version: budget.version,
            },
          });
        }
      }
    });
  }
}
