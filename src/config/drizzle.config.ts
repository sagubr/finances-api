import { defineConfig } from "drizzle-kit";
import { env } from "./env.config.js";

const decodeBase64 = (value: string | undefined): string | undefined =>
  value ? Buffer.from(value, "base64").toString("utf8") : undefined;

const migrationSsl =
  env.DB_SSL_MODE === "disabled"
    ? undefined
    : {
        rejectUnauthorized: env.DB_SSL_MODE !== "required",
        ...(env.DB_SSL_CA_BASE64 ? { ca: decodeBase64(env.DB_SSL_CA_BASE64) } : {}),
        ...(env.DB_SSL_CERT_BASE64 ? { cert: decodeBase64(env.DB_SSL_CERT_BASE64) } : {}),
        ...(env.DB_SSL_KEY_BASE64 ? { key: decodeBase64(env.DB_SSL_KEY_BASE64) } : {}),
        ...(env.DB_SSL_SERVER_NAME ? { servername: env.DB_SSL_SERVER_NAME } : {}),
      };

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema.ts",
  out: "./migrations",
  migrations: { table: "migrations", schema: "public" },
  dbCredentials: {
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: migrationSsl ?? false,
  },
  verbose: true,
  breakpoints: true,
});
