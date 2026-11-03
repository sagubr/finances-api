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

  it("requires explicit HTTPS CORS origins in production", () => {
    const production = {
      ...validEnvironment,
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
});
