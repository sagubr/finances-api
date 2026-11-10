import { readRuntimeConfig } from "#/config/runtime.config.js";
import { describe, expect, it } from "vitest";

const validEnvironment = {
  NODE_ENV: "test",
  DATABASE_HOST: "localhost",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "finances",
  DATABASE_USER: "finances_runtime",
  DATABASE_PASSWORD: "secret",
  DB_SSL_MODE: "disabled",
} as const;

const productionDatabase = {
  DATABASE_HOST: "db.example.com",
  DATABASE_USER: "finances_app",
  DATABASE_PASSWORD: "production-database-password",
  DB_SSL_MODE: "verify-full",
  DB_SSL_CA_BASE64: Buffer.from("certificate-authority").toString("base64"),
  DB_SSL_SERVER_NAME: "db.example.com",
  RESEND_API_KEY: "re_production-key",
  EMAIL_FROM: "Nummo <no-reply@example.com>",
  REDIS_URL: "rediss://cache.example.com",
} as const;

describe("runtime configuration", () => {
  it("builds the PostgreSQL pool configuration from validated environment fields", () => {
    const config = readRuntimeConfig(validEnvironment);

    expect(config.isDatabaseConfigured).toBe(true);
    expect(config.poolConfig).toMatchObject({
      host: "localhost",
      port: 5432,
      database: "finances",
      user: "finances_runtime",
      max: 10,
    });
    expect(config.trustProxy).toBe(false);
  });

  it("trusts only an explicitly configured number of reverse-proxy hops", () => {
    expect(readRuntimeConfig({ ...validEnvironment, TRUST_PROXY_HOPS: "1" }).trustProxy).toBe(1);
    expect(() => readRuntimeConfig({ ...validEnvironment, TRUST_PROXY_HOPS: "11" })).toThrow();
  });

  it("rejects a TLS client certificate without its private key", () => {
    expect(() =>
      readRuntimeConfig({
        ...validEnvironment,
        DB_SSL_MODE: "required",
        DB_SSL_CERT_BASE64: Buffer.from("certificate").toString("base64"),
      }),
    ).toThrow("certificate and key");
  });

  it("normalizes configured CORS origins in its own config boundary", () => {
    const config = readRuntimeConfig({
      ...validEnvironment,
      CORS_ALLOWED_ORIGINS: "https://app.example.com/, https://admin.example.com",
    });

    expect(config.corsAllowedOrigins).toEqual([
      "https://app.example.com",
      "https://admin.example.com",
    ]);
  });

  it("requires independent application secrets in production", () => {
    expect(() => readRuntimeConfig({ ...validEnvironment, NODE_ENV: "production" })).toThrow(
      "COOKIE_SECRET and TOKEN_ENCRYPTION_KEY",
    );
  });

  it("allows email auto-confirmation only outside production", () => {
    expect(
      readRuntimeConfig({ ...validEnvironment, AUTH_AUTO_CONFIRM_EMAIL: "true" }).autoConfirmEmail,
    ).toBe(true);

    expect(() =>
      readRuntimeConfig({
        ...validEnvironment,
        ...productionDatabase,
        NODE_ENV: "production",
        COOKIE_SECRET: "cookie-secret-that-is-at-least-32-characters",
        TOKEN_ENCRYPTION_KEY: "token-secret-that-is-at-least-32-characters",
        CORS_ALLOWED_ORIGINS: "https://app.example.com",
        AUTH_AUTO_CONFIRM_EMAIL: "true",
      }),
    ).toThrow("AUTH_AUTO_CONFIRM_EMAIL");
  });

  it("requires the Resend key and sender to be configured together", () => {
    expect(() => readRuntimeConfig({ ...validEnvironment, RESEND_API_KEY: "re_test" })).toThrow(
      "RESEND_API_KEY and EMAIL_FROM",
    );
    expect(
      readRuntimeConfig({
        ...validEnvironment,
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "Nummo <no-reply@example.com>",
      }).emailFrom,
    ).toBe("Nummo <no-reply@example.com>");
  });

  it("requires explicit HTTPS CORS origins in production", () => {
    const production = {
      ...validEnvironment,
      ...productionDatabase,
      NODE_ENV: "production",
      COOKIE_SECRET: "cookie-secret-that-is-at-least-32-characters",
      TOKEN_ENCRYPTION_KEY: "token-secret-that-is-at-least-32-characters",
    } as const;

    expect(() => readRuntimeConfig(production)).toThrow("CORS_ALLOWED_ORIGINS");
    expect(() =>
      readRuntimeConfig({ ...production, CORS_ALLOWED_ORIGINS: "http://app.example.com" }),
    ).toThrow("HTTPS origins");
    expect(
      readRuntimeConfig({ ...production, CORS_ALLOWED_ORIGINS: "https://app.example.com" })
        .corsAllowedOrigins,
    ).toEqual(["https://app.example.com"]);
  });

  it("rejects privileged default database credentials and unverified TLS in production", () => {
    const production = {
      ...validEnvironment,
      NODE_ENV: "production",
      COOKIE_SECRET: "cookie-secret-that-is-at-least-32-characters",
      TOKEN_ENCRYPTION_KEY: "token-secret-that-is-at-least-32-characters",
      CORS_ALLOWED_ORIGINS: "https://app.example.com",
      RESEND_API_KEY: "re_production-key",
      EMAIL_FROM: "Nummo <no-reply@example.com>",
      REDIS_URL: "rediss://cache.example.com",
    } as const;

    expect(() =>
      readRuntimeConfig({
        ...production,
        DATABASE_USER: "postgres",
        DATABASE_PASSWORD: "postgres",
      }),
    ).toThrow("restricted runtime role");
    expect(() =>
      readRuntimeConfig({
        ...production,
        DATABASE_USER: "finances_app",
        DATABASE_PASSWORD: "production-database-password",
      }),
    ).toThrow("DB_SSL_MODE=verify-full");
  });

  it("requires encrypted Redis transport in production", () => {
    const production = {
      ...validEnvironment,
      ...productionDatabase,
      NODE_ENV: "production",
      COOKIE_SECRET: "cookie-secret-that-is-at-least-32-characters",
      TOKEN_ENCRYPTION_KEY: "token-secret-that-is-at-least-32-characters",
      CORS_ALLOWED_ORIGINS: "https://app.example.com",
    } as const;

    expect(() =>
      readRuntimeConfig({ ...production, REDIS_URL: "redis://cache.example.com" }),
    ).toThrow("rediss");
    expect(
      readRuntimeConfig({ ...production, REDIS_URL: "rediss://cache.example.com" }).redisUrl,
    ).toBe("rediss://cache.example.com");
  });
});
