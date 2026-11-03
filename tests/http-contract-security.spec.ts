import { createFastifyApplication } from "#/bootstrap/fastify.factory.js";
import {
  civilDateSchema,
  competenceMonthSchema,
  ianaTimezoneSchema,
  idempotencyKeySchema,
  publicIdSchema,
} from "#/shared/validation/http-primitives.js";
import { describe, expect, it } from "vitest";

describe("HTTP contract security primitives", () => {
  it("accepts only public UUIDv7 identifiers", () => {
    expect(publicIdSchema.safeParse("019a3ee6-9a44-7c08-a0ee-bf2281547480").success).toBe(true);
    expect(publicIdSchema.safeParse("019a3ee6-9a44-4c08-a0ee-bf2281547480").success).toBe(false);
  });

  it("rejects impossible civil dates and invalid competence months", () => {
    expect(civilDateSchema.safeParse("2024-02-29").success).toBe(true);
    expect(civilDateSchema.safeParse("2025-02-29").success).toBe(false);
    expect(civilDateSchema.safeParse("2026-13-01").success).toBe(false);
    expect(competenceMonthSchema.safeParse("2026-12").success).toBe(true);
    expect(competenceMonthSchema.safeParse("2026-13").success).toBe(false);
  });

  it("accepts IANA timezones and visible ASCII idempotency keys", () => {
    expect(ianaTimezoneSchema.safeParse("America/Sao_Paulo").success).toBe(true);
    expect(ianaTimezoneSchema.safeParse("GMT-03:00").success).toBe(false);
    expect(idempotencyKeySchema.safeParse("checkout-019a3ee6").success).toBe(true);
    expect(idempotencyKeySchema.safeParse("checkout key 019a3ee6").success).toBe(false);
  });

  it("preserves only bounded request IDs supplied by clients", async () => {
    const app = createFastifyApplication({ logLevel: "silent", trustProxy: false });
    app.get("/request-id", (request) => ({ requestId: request.id, ip: request.ip }));

    const accepted = await app.inject({
      method: "GET",
      url: "/request-id",
      headers: { "x-request-id": "frontend.request-123" },
    });
    const replaced = await app.inject({
      method: "GET",
      url: "/request-id",
      headers: {
        "x-forwarded-for": "203.0.113.1",
        "x-request-id": "invalid request id",
      },
    });

    expect(accepted.json()).toMatchObject({ requestId: "frontend.request-123" });
    expect(accepted.headers["x-request-id"]).toBe("frontend.request-123");
    expect(replaced.json<{ requestId: string; ip: string }>().requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(replaced.json<{ requestId: string; ip: string }>().ip).not.toBe("203.0.113.1");

    await app.close();
  });

  it("trusts only the configured reverse-proxy hop count", async () => {
    const app = createFastifyApplication({ logLevel: "silent", trustProxy: 1 });
    app.get("/client-ip", (request) => ({ ip: request.ip }));

    const response = await app.inject({
      method: "GET",
      url: "/client-ip",
      headers: { "x-forwarded-for": "203.0.113.1" },
    });

    expect(response.json()).toEqual({ ip: "203.0.113.1" });
    await app.close();
  });
});
