import type { IMaintenanceRepository } from "#/modules/platform/application/ports/maintenance.repository.js";
import type { IWorkerUnitOfWork } from "#/worker/application/ports/worker.unit-of-work.js";

const dateInTimezone = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export class ScheduleMaintenanceUseCase {
  constructor(
    private readonly maintenance: IMaintenanceRepository,
    private readonly unitOfWork: IWorkerUnitOfWork,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async execute(): Promise<void> {
    const workspaces = await this.maintenance.listWorkspaces();
    for (const workspace of workspaces) {
      const instant = this.now();
      const referenceOn = dateInTimezone(instant, workspace.timezone);
      const month = referenceOn.slice(0, 7);
      const hourWindow = instant.toISOString().slice(0, 13);
      await this.unitOfWork.run(workspace.id, async ({ planning, scheduledJobs }) => {
        const ruleIds = await planning.listActiveRuleIds(referenceOn);
        await scheduledJobs.schedule([
          {
            publicId: this.generateId(),
            workspaceId: workspace.id,
            name: "close-card-statements",
            executionKey: `close-card-statements:${workspace.id.toString()}:${referenceOn}`,
            payload: { referenceOn },
          },
          {
            publicId: this.generateId(),
            workspaceId: workspace.id,
            name: "clean-expired-import-files",
            executionKey: `clean-expired-import-files:${workspace.id.toString()}:${referenceOn}`,
            payload: { referenceOn },
          },
          ...ruleIds.map((ruleId) => ({
            publicId: this.generateId(),
            workspaceId: workspace.id,
            name: "generate-occurrences",
            executionKey: `generate-occurrences:${ruleId}:${referenceOn}`,
            payload: { ruleId, referenceOn },
          })),
          {
            publicId: this.generateId(),
            workspaceId: workspace.id,
            name: "settle-overdue-transactions",
            executionKey: `settle-overdue-transactions:${workspace.id.toString()}:${hourWindow}`,
            payload: { referenceOn },
          },
          {
            publicId: this.generateId(),
            workspaceId: workspace.id,
            name: "reconcile-budgets",
            executionKey: `reconcile-budgets:${workspace.id.toString()}:${hourWindow}`,
            payload: { month },
          },
        ]);
      });
    }
  }
}
