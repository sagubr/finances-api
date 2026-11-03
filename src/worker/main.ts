import { runtimeConfig } from "#/config/runtime.config.js";
import { closeDatabase } from "#/infrastructure/database/db.provider.js";
import { toSafeErrorLog } from "#/shared/observability/safe-error-log.js";
import pino from "pino";
import { wait } from "./runtime.js";
import { workerServices } from "./worker.factory.js";

const logger = pino({ name: "finances-worker" });

const start = async (): Promise<void> => {
  if (!runtimeConfig.isDatabaseConfigured)
    throw new Error("Database credentials are required to run the worker.");
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  logger.info({ outboxEnabled: Boolean(workerServices.dispatchOutbox) }, "Worker started");
  let maintenanceScheduledAt = 0;

  try {
    while (!controller.signal.aborted) {
      try {
        if (Date.now() - maintenanceScheduledAt >= 300_000) {
          await workerServices.scheduleMaintenance.execute();
          maintenanceScheduledAt = Date.now();
        }
        if (workerServices.dispatchOutbox) await workerServices.dispatchOutbox.execute();
        const processed = await workerServices.processNextJob.execute();
        if (!processed) await wait(2_000, controller.signal);
      } catch (error: unknown) {
        logger.error({ error: toSafeErrorLog(error) }, "Worker iteration failed");
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
  logger.error({ error: toSafeErrorLog(error) }, "Worker failed");
  await closeDatabase().catch(() => undefined);
  process.exitCode = 1;
});
