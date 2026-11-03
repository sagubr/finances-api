import { authConfig, createAuthConfig, type AuthConfig } from "#/config/auth.config.js";
import { corsConfig, createCorsConfig, type CorsConfig } from "#/config/cors.config.js";
import {
  createDatabaseConfig,
  databaseConfig,
  type DatabaseConfig,
} from "#/config/database.config.js";
import { parseEnvironment, type Environment } from "#/config/env.config.js";
import { createQueueConfig, queueConfig, type QueueConfig } from "#/config/queue.config.js";
import { createServerConfig, serverConfig, type ServerConfig } from "#/config/server.config.js";
import { createStorageConfig, storageConfig, type StorageConfig } from "#/config/storage.config.js";

export type RuntimeConfig = Readonly<
  ServerConfig & CorsConfig & DatabaseConfig & AuthConfig & StorageConfig & QueueConfig
>;

const validateRuntimeConfig = (config: RuntimeConfig): RuntimeConfig => {
  if (config.environment === "production" && (!config.cookieSecret || !config.tokenEncryptionKey))
    throw new Error("COOKIE_SECRET and TOKEN_ENCRYPTION_KEY are required in production.");
  if (config.environment === "production") {
    if (config.autoConfirmEmail)
      throw new Error("AUTH_AUTO_CONFIRM_EMAIL cannot be enabled in production.");
    if (config.corsAllowedOrigins.length === 0)
      throw new Error("At least one CORS_ALLOWED_ORIGINS value is required in production.");
    for (const origin of config.corsAllowedOrigins) {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:" || parsed.origin !== origin)
        throw new Error("Production CORS origins must be HTTPS origins without paths.");
    }
    if (
      config.poolConfig.user === "postgres" ||
      config.poolConfig.password === "postgres" ||
      !config.poolConfig.user ||
      !config.poolConfig.password
    )
      throw new Error(
        "Production requires explicit database credentials for a restricted runtime role.",
      );
    if (config.sslMode !== "verify-full")
      throw new Error("Production database connections require DB_SSL_MODE=verify-full.");
    if (config.redisUrl && !config.redisUrl.startsWith("rediss://"))
      throw new Error("Production Redis connections require the rediss protocol.");
  }
  return Object.freeze(config);
};

export const createRuntimeConfig = (value: Environment): RuntimeConfig => {
  const config = {
    ...createServerConfig(value),
    ...createCorsConfig(value),
    ...createDatabaseConfig(value),
    ...createAuthConfig(value),
    ...createStorageConfig(value),
    ...createQueueConfig(value),
  };

  return validateRuntimeConfig(config);
};

export const readRuntimeConfig = (environment: NodeJS.ProcessEnv): RuntimeConfig =>
  createRuntimeConfig(parseEnvironment(environment));

export const runtimeConfig: RuntimeConfig = validateRuntimeConfig({
  ...serverConfig,
  ...corsConfig,
  ...databaseConfig,
  ...authConfig,
  ...storageConfig,
  ...queueConfig,
});
