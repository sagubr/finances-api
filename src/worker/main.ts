import { runtimeConfig } from "#/config/runtime.config.js";
import { closeDatabase } from "#/infrastructure/database/db.provider.js";
import { toDiagnosticErrorLog } from "#/shared/observability/safe-error-log.js";
import pino from "pino";
import { wait } from "./runtime.js";
import { workerServices } from "./worker.factory.js";

const logger = pino(
  { name: "finances-worker", level: runtimeConfig.logLevel },
  pino.multistream(
    [
      { level: "trace", stream: process.stdout },
      { level: "error", stream: process.stderr },
    ],
    { dedupe: true },
  ),
);

type WorkerStage = "schedule-maintenance" | "dispatch-outbox" | "process-job" | "idle";

const start = async (): Promise<void> => {
  if (!runtimeConfig.isDatabaseConfigured)
    throw new Error("Database credentials are required to run the worker.");
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  logger.info(
    {
      environment: runtimeConfig.environment,
      logLevel: runtimeConfig.logLevel,
      outboxEnabled: Boolean(workerServices.dispatchOutbox),
    },
    "Worker started",
  );
  let maintenanceScheduledAt = 0;
  let stage: WorkerStage = "idle";

  try {
    while (!controller.signal.aborted) {
      try {
        if (Date.now() - maintenanceScheduledAt >= 300_000) {
          stage = "schedule-maintenance";
          await workerServices.scheduleMaintenance.execute();
          maintenanceScheduledAt = Date.now();
        }
        if (workerServices.dispatchOutbox) {
          stage = "dispatch-outbox";
          await workerServices.dispatchOutbox.execute();
        }
        stage = "process-job";
        const processed = await workerServices.processNextJob.execute();
        stage = "idle";
        if (!processed) await wait(2_000, controller.signal);
      } catch (error: unknown) {
        logger.error({ stage, error: toDiagnosticErrorLog(error) }, "Worker iteration failed");
        stage = "idle";
        await wait(5_000, controller.signal);
      }
    }
  } finally {
    await workerServices.close();
    await closeDatabase();
    logger.info("Worker stopped");
  }
};

start().catch(async (error: unknown) => {
  logger.error({ error: toDiagnosticErrorLog(error) }, "Worker failed");
  await closeDatabase().catch(() => undefined);
  process.exitCode = 1;
});
