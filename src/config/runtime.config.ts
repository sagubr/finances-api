import { authConfig, createAuthConfig, type AuthConfig } from "#/config/auth.config.js";
import { corsConfig, createCorsConfig, type CorsConfig } from "#/config/cors.config.js";
import {
  createDatabaseConfig,
  databaseConfig,
  type DatabaseConfig,
} from "#/config/database.config.js";
import { createEmailConfig, emailConfig, type EmailConfig } from "#/config/email.config.js";
import { parseEnvironment, type Environment } from "#/config/env.config.js";
import { createQueueConfig, queueConfig, type QueueConfig } from "#/config/queue.config.js";
import { createServerConfig, serverConfig, type ServerConfig } from "#/config/server.config.js";
import { createStorageConfig, storageConfig, type StorageConfig } from "#/config/storage.config.js";

export type RuntimeConfig = Readonly<
  ServerConfig &
    CorsConfig &
    DatabaseConfig &
    AuthConfig &
    EmailConfig &
    StorageConfig &
    QueueConfig
>;

export const createRuntimeConfig = (value: Environment): RuntimeConfig => {
  const config = {
    ...createServerConfig(value),
    ...createCorsConfig(value),
    ...createDatabaseConfig(value),
    ...createAuthConfig(value),
    ...createEmailConfig(value),
    ...createStorageConfig(value),
    ...createQueueConfig(value),
  };

  return Object.freeze(config);
};

export const readRuntimeConfig = (environment: NodeJS.ProcessEnv): RuntimeConfig =>
  createRuntimeConfig(parseEnvironment(environment));

export const runtimeConfig: RuntimeConfig = Object.freeze({
  ...serverConfig,
  ...corsConfig,
  ...databaseConfig,
  ...authConfig,
  ...emailConfig,
  ...storageConfig,
  ...queueConfig,
});
