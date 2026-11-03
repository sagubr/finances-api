import { runtimeConfig } from "#/config/runtime.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { WorkerUnitOfWork } from "#/infrastructure/database/worker.unit-of-work.js";
import { BullMqEventPublisher } from "#/infrastructure/queue/bullmq-event.publisher.js";
import { ImportStorage } from "#/modules/planning/infrastructure/file/import-storage.js";
import { JobRepository } from "#/modules/platform/infrastructure/database/job.repository.js";
import { MaintenanceRepository } from "#/modules/platform/infrastructure/database/maintenance.repository.js";
import { OutboxRepository } from "#/modules/platform/infrastructure/database/outbox.repository.js";
import { CleanExpiredImportFilesUseCase } from "#/worker/application/use-cases/clean-expired-import-files.use-case.js";
import { CloseCardStatementsUseCase } from "#/worker/application/use-cases/close-card-statements.use-case.js";
import { DispatchOutboxUseCase } from "#/worker/application/use-cases/dispatch-outbox.use-case.js";
import { GenerateOccurrencesUseCase } from "#/worker/application/use-cases/generate-occurrences.use-case.js";
import { ProcessNextJobUseCase } from "#/worker/application/use-cases/process-next-job.use-case.js";
import { ReconcileBudgetsUseCase } from "#/worker/application/use-cases/reconcile-budgets.use-case.js";
import { ScheduleMaintenanceUseCase } from "#/worker/application/use-cases/schedule-maintenance.use-case.js";
import { v7 as uuidv7 } from "uuid";

const unitOfWork = new WorkerUnitOfWork(db);
const jobs = new JobRepository(db);
const now = () => new Date();
const handlers = [
  new GenerateOccurrencesUseCase(unitOfWork, uuidv7),
  new CloseCardStatementsUseCase(unitOfWork, uuidv7),
  new ReconcileBudgetsUseCase(unitOfWork, uuidv7),
  new CleanExpiredImportFilesUseCase(
    unitOfWork,
    new ImportStorage(runtimeConfig.importStorageDir),
    now,
  ),
] as const;
const publisher = runtimeConfig.redisUrl ? new BullMqEventPublisher(runtimeConfig.redisUrl) : null;

export const workerServices = {
  processNextJob: new ProcessNextJobUseCase(jobs, handlers),
  scheduleMaintenance: new ScheduleMaintenanceUseCase(
    new MaintenanceRepository(db),
    unitOfWork,
    uuidv7,
    now,
  ),
  dispatchOutbox: publisher ? new DispatchOutboxUseCase(new OutboxRepository(db), publisher) : null,
  close: () => publisher?.close() ?? Promise.resolve(),
} as const;
