import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const looseNumber = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int(),
  );

const looseBoolean = (fallback: boolean) =>
  z.preprocess(
    (value) =>
      value === undefined || value === ""
        ? String(fallback)
        : typeof value === "boolean"
          ? String(value)
          : value,
    z.enum(["true", "false"]).transform((value) => value === "true"),
  );

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: looseNumber(3005).pipe(z.number().min(1).max(65_535)),
  TRUST_PROXY_HOPS: looseNumber(0).pipe(z.number().min(0).max(10)),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  DATABASE_HOST: z.string().min(1).default("localhost"),
  DATABASE_PORT: looseNumber(5432).pipe(z.number().min(1).max(65_535)),
  DATABASE_NAME: z.string().default("finances"),
  DATABASE_USER: z.string().default("postgres"),
  DATABASE_PASSWORD: z.string().default("postgres"),
  DB_SSL_MODE: z.enum(["disabled", "required", "verify-ca", "verify-full"]).default("disabled"),
  DB_SSL_CA_BASE64: z.string().optional(),
  DB_SSL_CERT_BASE64: z.string().optional(),
  DB_SSL_KEY_BASE64: z.string().optional(),
  DB_SSL_SERVER_NAME: z.string().optional(),
  DB_POOL_MAX: looseNumber(10).pipe(z.number().min(1).max(100)),
  DB_IDLE_TIMEOUT_MS: looseNumber(30_000).pipe(z.number().min(1)),
  DB_CONNECTION_TIMEOUT_MS: looseNumber(5_000).pipe(z.number().min(1)),
  COOKIE_SECRET: z.string().min(32).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  AUTH_AUTO_CONFIRM_EMAIL: looseBoolean(false),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3005/api/v1/auth/callback/google"),
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  REDIS_URL: z.string().min(1).optional(),
  IMPORT_STORAGE_DIR: z.string().min(1).default("/tmp/finances-imports"),
  IMPORT_STORAGE_QUOTA_BYTES: looseNumber(100 * 1024 * 1024).pipe(
    z
      .number()
      .min(10 * 1024 * 1024)
      .max(10 * 1024 * 1024 * 1024),
  ),
  EXPORT_STORAGE_DIR: z.string().min(1).default("/tmp/finances-exports"),
});

export type Environment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (input: NodeJS.ProcessEnv): Environment =>
  environmentSchema.parse(input);

export const env = parseEnvironment(process.env);
