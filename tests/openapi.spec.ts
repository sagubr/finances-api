import { buildApp } from "#/app.js";
import { readRuntimeConfig } from "#/config/runtime.config.js";
import { describe, expect, it } from "vitest";

const testConfig = readRuntimeConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });

describe("OpenAPI contract", () => {
  it("publishes one unique operationId for every registered API operation", async () => {
    const app = await buildApp({ config: testConfig });
    await app.ready();
    const serialized = JSON.stringify(app.swagger());
    const operationIds = [...serialized.matchAll(/"operationId":"([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(operationIds).toEqual(
      expect.arrayContaining([
        "createTransaction",
        "listTransactions",
        "createInstallmentPlan",
        "createRecurringRule",
        "createCardPurchase",
      ]),
    );
    expect(app.swagger()).toMatchObject({
      components: {
        securitySchemes: {
          sessionCookie: { type: "apiKey", in: "cookie", name: "finances_session" },
        },
      },
      security: [{ sessionCookie: [] }],
    });

    await app.close();
  });

  it("documents CSRF for every mutation and keeps public operations explicit", async () => {
    const app = await buildApp({ config: testConfig });
    await app.ready();
    const document = app.swagger() as {
      paths: Record<
        string,
        Record<
          string,
          {
            parameters?: Array<{ in?: string; name?: string; required?: boolean }>;
            security?: unknown[];
          }
        >
      >;
    };

    for (const path of Object.values(document.paths)) {
      for (const method of ["post", "put", "patch", "delete"] as const) {
        const operation = path[method];
        if (!operation) continue;
        expect(
          operation.parameters,
          `${method.toUpperCase()} mutation without CSRF header`,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ in: "header", name: "x-csrf-token", required: true }),
          ]),
        );
      }
    }

    expect(document.paths["/api/v1/health"]?.get?.security).toEqual([]);
    expect(document.paths["/api/v1/auth/csrf"]?.get?.security).toEqual([]);
    expect(document.paths["/api/v1/auth/login"]?.post?.security).toEqual([]);
    expect(document.paths["/api/v1/billing/checkout"]).toBeUndefined();
    expect(document.paths["/api/v1/billing/portal"]).toBeUndefined();
    expect(document.paths["/api/v1/payroll/net-salary"]).toBeUndefined();
    expect(document.paths["/api/v1/installment-plans"]?.get).toBeDefined();
    expect(document.paths["/api/v1/accounts"]?.get).toBeDefined();
    expect(document.paths["/api/v1/investments/accounts"]).toBeUndefined();
    expect(document.paths["/api/v1/privacy/exports/{id}/download-token"]).toBeUndefined();
    expect(document.paths["/api/v1/privacy/exports/{id}/download"]).toBeUndefined();

    await app.close();
  });
});
