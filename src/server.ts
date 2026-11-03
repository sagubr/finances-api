import { buildApp } from "#/app.js";
import { runtimeConfig } from "#/config/runtime.config.js";
import { closeDatabase } from "#/infrastructure/database/db.provider.js";
import { toSafeErrorLog } from "#/shared/observability/safe-error-log.js";

const start = async (): Promise<void> => {
  const app = await buildApp();

  const close = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, "Stopping HTTP server");
    await app.close();
    await closeDatabase();
    process.exitCode = 0;
  };

  process.once("SIGINT", () => void close("SIGINT"));
  process.once("SIGTERM", () => void close("SIGTERM"));

  await app.listen({ host: runtimeConfig.host, port: runtimeConfig.port });
};

start().catch(async (error: unknown) => {
  process.stderr.write(`Failed to start HTTP server: ${JSON.stringify(toSafeErrorLog(error))}\n`);
  await closeDatabase().catch(() => undefined);
  process.exitCode = 1;
});
