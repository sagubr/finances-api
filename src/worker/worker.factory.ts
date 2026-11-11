import { runtimeConfig } from "#/config/runtime.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { WorkerUnitOfWork } from "#/infrastructure/database/worker.unit-of-work.js";
import { ResendEmailProvider } from "#/infrastructure/email/resend-email.provider.js";
import { BullMqEventPublisher } from "#/infrastructure/queue/bullmq-event.publisher.js";
import { RoutingEventPublisher } from "#/infrastructure/queue/routing-event.publisher.js";
import { AesGcmContentCipher } from "#/infrastructure/security/content-cipher.js";
import { ImportStorage } from "#/modules/planning/infrastructure/file/import-storage.js";
import { SendIdentityEmailUseCase } from "#/modules/platform/application/use-cases/send-identity-email.use-case.js";
import { IdentityEmailRepository } from "#/modules/platform/infrastructure/database/identity-email.repository.js";
import { JobRepository } from "#/modules/platform/infrastructure/database/job.repository.js";
import { MaintenanceRepository } from "#/modules/platform/infrastructure/database/maintenance.repository.js";
import { OutboxRepository } from "#/modules/platform/infrastructure/database/outbox.repository.js";
import { ScheduledJobRepository } from "#/modules/platform/infrastructure/database/scheduled-job.repository.js";
import { RefreshMarketQuotesUseCase } from "#/modules/wealth/application/use-cases/refresh-market-quotes.use-case.js";
import { MarketDataCatalogRepository } from "#/modules/wealth/infrastructure/database/market-data-catalog.repository.js";
import { BrapiMarketDataProvider } from "#/modules/wealth/infrastructure/integrations/brapi-market-data.provider.js";
import { EmailService } from "#/shared/application/email.service.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import { CleanExpiredImportFilesUseCase } from "#/worker/application/use-cases/clean-expired-import-files.use-case.js";
import { CloseCardStatementsUseCase } from "#/worker/application/use-cases/close-card-statements.use-case.js";
import { DispatchOutboxUseCase } from "#/worker/application/use-cases/dispatch-outbox.use-case.js";
import { GenerateOccurrencesUseCase } from "#/worker/application/use-cases/generate-occurrences.use-case.js";
import { ProcessNextJobUseCase } from "#/worker/application/use-cases/process-next-job.use-case.js";
import { ReconcileBudgetsUseCase } from "#/worker/application/use-cases/reconcile-budgets.use-case.js";
import { ScheduleMaintenanceUseCase } from "#/worker/application/use-cases/schedule-maintenance.use-case.js";
import { SettleOverdueTransactionsUseCase } from "#/worker/application/use-cases/settle-overdue-transactions.use-case.js";
import { v7 as uuidv7 } from "uuid";

const unitOfWork = new WorkerUnitOfWork(db);
const jobs = new JobRepository(db);
const scheduledJobs = new ScheduledJobRepository(db);
const now = () => new Date();
const brapiProvider = new BrapiMarketDataProvider({
  ...(runtimeConfig.brapiApiKey ? { apiKey: runtimeConfig.brapiApiKey } : {}),
  baseUrl: runtimeConfig.brapiBaseUrl,
  timeoutMs: runtimeConfig.brapiTimeoutMs,
});
const marketDataCatalog = new MarketDataCatalogRepository(db, uuidv7);
const handlers: IJobHandler[] = [
  new GenerateOccurrencesUseCase(unitOfWork, uuidv7),
  new CloseCardStatementsUseCase(unitOfWork, uuidv7),
  new ReconcileBudgetsUseCase(unitOfWork, uuidv7),
  new CleanExpiredImportFilesUseCase(
    unitOfWork,
    new ImportStorage(runtimeConfig.importStorageDir),
    now,
  ),
  new SettleOverdueTransactionsUseCase(unitOfWork),
  ...(runtimeConfig.brapiApiKey
    ? [
        new RefreshMarketQuotesUseCase(brapiProvider, marketDataCatalog, {
          cacheMs: runtimeConfig.marketQuoteCacheMinutes * 60_000,
          minRequestIntervalMs: runtimeConfig.brapiMinRequestIntervalMs,
          now,
        }),
      ]
    : []),
];
const queuePublisher = runtimeConfig.redisUrl
  ? new BullMqEventPublisher(runtimeConfig.redisUrl)
  : null;
const emailProvider =
  runtimeConfig.resendApiKey && runtimeConfig.emailFrom
    ? new ResendEmailProvider(
        runtimeConfig.resendApiKey,
        runtimeConfig.emailFrom,
        runtimeConfig.emailReplyTo,
      )
    : null;
const tokenCipher = new AesGcmContentCipher(
  runtimeConfig.tokenEncryptionKey ??
    runtimeConfig.cookieSecret ??
    "finances-development-token-encryption-key",
);
const publisher =
  queuePublisher && emailProvider
    ? new RoutingEventPublisher(
        new SendIdentityEmailUseCase(
          new IdentityEmailRepository(db),
          new EmailService(emailProvider),
          (ciphertext) => tokenCipher.decrypt(ciphertext),
          runtimeConfig.webAppUrl,
        ),
        queuePublisher,
      )
    : queuePublisher;

export const workerServices = {
  processNextJob: new ProcessNextJobUseCase(jobs, handlers),
  scheduleMaintenance: new ScheduleMaintenanceUseCase(
    new MaintenanceRepository(db),
    unitOfWork,
    uuidv7,
    now,
    scheduledJobs,
    runtimeConfig.brapiApiKey ? runtimeConfig.marketQuoteRefreshMinutes : undefined,
  ),
  dispatchOutbox: publisher ? new DispatchOutboxUseCase(new OutboxRepository(db), publisher) : null,
  close: () => publisher?.close() ?? Promise.resolve(),
} as const;
