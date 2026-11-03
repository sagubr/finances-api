import { buildApp } from "#/app.js";
import { readRuntimeConfig } from "#/config/runtime.config.js";
import { describe, expect, it } from "vitest";

const testConfig = readRuntimeConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });

describe("health route", () => {
  it("returns the liveness envelope", async () => {
    const app = await buildApp({ config: testConfig });
    const result = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(result.statusCode).toBe(200);
    expect(result.json()).toEqual({ success: true, data: { status: "ok" } });

    await app.close();
  });

  it("protects canonical tenant routes through request-context middleware", async () => {
    const app = await buildApp({ config: testConfig });
    const result = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
      headers: { "x-workspace": "019a3ee6-9a44-7c08-a0ee-bf2281547480" },
    });

    expect(result.statusCode).toBe(401);
    expect(result.json()).toMatchObject({
      success: false,
      data: { code: "AUTHENTICATION_REQUIRED" },
    });

    await app.close();
  });

  it("maps Zod route validation failures to the public 400 envelope", async () => {
    const app = await buildApp({ config: testConfig });
    const csrf = await app.inject({ method: "GET", url: "/api/v1/auth/csrf" });
    const csrfCookie = csrf.cookies[0];
    const csrfToken = csrf.json<{ data: { token: string } }>().data.token;
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/accounts",
      headers: {
        "idempotency-key": "valid-key-123456",
        "x-csrf-token": csrfToken,
        "x-workspace": "019a3ee6-9a44-7c08-a0ee-bf2281547480",
        ...(csrfCookie ? { cookie: `${csrfCookie.name}=${csrfCookie.value}` } : {}),
      },
      payload: {},
    });

    expect(result.statusCode).toBe(400);
    expect(result.json()).toMatchObject({
      success: false,
      data: { code: "VALIDATION_ERROR" },
    });

    await app.close();
  });

  it("maps framework CSRF failures to a public 403 instead of an internal error", async () => {
    const app = await buildApp({ config: testConfig });
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/accounts",
      headers: {
        "idempotency-key": "valid-key-123456",
        "x-workspace": "019a3ee6-9a44-7c08-a0ee-bf2281547480",
      },
      payload: {
        name: "Conta corrente",
        type: "CHECKING",
        currency: "BRL",
        openingBalanceOn: "2026-11-02",
      },
    });

    expect(result.statusCode).toBe(403);
    expect(result.json()).toMatchObject({
      success: false,
      data: { code: "FST_CSRF_MISSING_SECRET" },
    });

    await app.close();
  });
});
