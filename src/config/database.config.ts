import { env, type Environment } from "#/config/env.config.js";
import type { PoolConfig } from "pg";

const decodeBase64 = (value: string | undefined): string | undefined =>
  value ? Buffer.from(value, "base64").toString("utf8") : undefined;

export type DatabaseConfig = Readonly<{
  isDatabaseConfigured: boolean;
  poolConfig: Readonly<PoolConfig>;
}>;

export const createDatabaseConfig = (environment: Environment): DatabaseConfig => {
  const certificateConfigured = environment.DB_SSL_CERT_BASE64 !== undefined;
  const keyConfigured = environment.DB_SSL_KEY_BASE64 !== undefined;
  if (certificateConfigured !== keyConfigured)
    throw new Error("Database TLS certificate and key must be configured together.");
  if (
    (environment.DB_SSL_MODE === "verify-ca" || environment.DB_SSL_MODE === "verify-full") &&
    !environment.DB_SSL_CA_BASE64
  )
    throw new Error("Database TLS verification requires a CA.");
  if (environment.DB_SSL_MODE === "verify-full" && !environment.DB_SSL_SERVER_NAME)
    throw new Error("Database TLS verify-full requires DB_SSL_SERVER_NAME.");
  if (
    environment.DB_SSL_MODE === "verify-full" &&
    environment.DB_SSL_SERVER_NAME !== environment.DATABASE_HOST
  )
    throw new Error("DB_SSL_SERVER_NAME must equal DATABASE_HOST for hostname verification.");

  const ssl =
    environment.DB_SSL_MODE === "disabled"
      ? undefined
      : {
          rejectUnauthorized: environment.DB_SSL_MODE !== "required",
          ca: decodeBase64(environment.DB_SSL_CA_BASE64),
          cert: decodeBase64(environment.DB_SSL_CERT_BASE64),
          key: decodeBase64(environment.DB_SSL_KEY_BASE64),
          servername: environment.DB_SSL_SERVER_NAME,
        };
  const isDatabaseConfigured = Boolean(
    environment.DATABASE_NAME && environment.DATABASE_USER && environment.DATABASE_PASSWORD,
  );
  if (environment.NODE_ENV === "production" && !isDatabaseConfigured)
    throw new Error("Production database name, user and password are required.");

  return Object.freeze({
    isDatabaseConfigured,
    poolConfig: Object.freeze({
      host: environment.DATABASE_HOST,
      port: environment.DATABASE_PORT,
      database: environment.DATABASE_NAME,
      user: environment.DATABASE_USER,
      password: environment.DATABASE_PASSWORD,
      max: environment.DB_POOL_MAX,
      idleTimeoutMillis: environment.DB_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: environment.DB_CONNECTION_TIMEOUT_MS,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
      ...(ssl ? { ssl } : {}),
    }),
  });
};

export const databaseConfig = createDatabaseConfig(env);
