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

const validateRuntimeConfig = (config: RuntimeConfig): RuntimeConfig => {
  if (Boolean(config.googleClientId) !== Boolean(config.googleClientSecret))
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together.",
    );
  if (Boolean(config.resendApiKey) !== Boolean(config.emailFrom))
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be configured together.");
  if (config.environment === "production" && (!config.cookieSecret || !config.tokenEncryptionKey))
    throw new Error("COOKIE_SECRET and TOKEN_ENCRYPTION_KEY are required in production.");
  if (config.environment === "production") {
    if (config.autoConfirmEmail)
      throw new Error("AUTH_AUTO_CONFIRM_EMAIL cannot be enabled in production.");
    if (!config.resendApiKey || !config.emailFrom)
      throw new Error("RESEND_API_KEY and EMAIL_FROM are required in production.");
    if (!config.redisUrl)
      throw new Error("REDIS_URL is required in production to dispatch transactional emails.");
    if (config.corsAllowedOrigins.length === 0)
      throw new Error("At least one CORS_ALLOWED_ORIGINS value is required in production.");
    for (const origin of config.corsAllowedOrigins) {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:" || parsed.origin !== origin)
        throw new Error("Production CORS origins must be HTTPS origins without paths.");
    }
    if (config.redisUrl && !config.redisUrl.startsWith("rediss://"))
      throw new Error("Production Redis connections require the rediss protocol.");
    if (config.googleClientId) {
      if (!config.googleRedirectUri.startsWith("https://"))
        throw new Error("The production Google OAuth redirect URI must use HTTPS.");
      if (!config.webAppUrl.startsWith("https://"))
        throw new Error("The production web app URL must use HTTPS.");
    }
  }
  return Object.freeze(config);
};

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

  return validateRuntimeConfig(config);
};

export const readRuntimeConfig = (environment: NodeJS.ProcessEnv): RuntimeConfig =>
  createRuntimeConfig(parseEnvironment(environment));

export const runtimeConfig: RuntimeConfig = validateRuntimeConfig({
  ...serverConfig,
  ...corsConfig,
  ...databaseConfig,
  ...authConfig,
  ...emailConfig,
  ...storageConfig,
  ...queueConfig,
});
