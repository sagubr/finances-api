import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { IdempotencyExecutor } from "#/modules/transactions/infrastructure/database/idempotency.executor.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const context: RequestContext = {
  userId: 1n,
  userPublicId: "019a4c64-9a81-7000-8000-000000000001",
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: "019a4c64-9a81-7000-8000-000000000002",
  role: "OWNER",
  requestId: "idempotency-request",
};

const responseSchema = z.object({ id: z.string() });

const createDatabase = (record: unknown, calls: string[]) =>
  ({
    execute: vi.fn(() => {
      calls.push("lock");
      return Promise.resolve();
    }),
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            calls.push("select");
            return Promise.resolve(record ? [record] : []);
          },
        }),
      }),
    })),
    delete: vi.fn(() => ({
      where: () => {
        calls.push("delete");
        return Promise.resolve();
      },
    })),
    insert: vi.fn(() => ({
      values: () => {
        calls.push("insert");
        return Promise.resolve();
      },
    })),
    update: vi.fn(() => ({
      set: () => ({
        where: () => {
          calls.push("update");
          return Promise.resolve();
        },
      }),
    })),
  }) as unknown as TenantDatabase;

describe("IdempotencyExecutor", () => {
  it("atomically replaces an expired key before running the operation", async () => {
    const calls: string[] = [];
    const database = createDatabase(
      {
        id: 10n,
        requestHash: "expired-hash",
        responseBody: { id: "old" },
        expiresAt: new Date(Date.now() - 1_000),
      },
      calls,
    );
    const work = vi.fn(() => Promise.resolve({ id: "new" }));

    await expect(
      new IdempotencyExecutor(database, context).execute(
        "create",
        "reusable-key",
        { value: 1 },
        responseSchema,
        work,
      ),
    ).resolves.toEqual({ id: "new" });

    expect(work).toHaveBeenCalledOnce();
    expect(calls).toEqual(["lock", "select", "delete", "insert", "update"]);
  });

  it("replays a live completed response without executing work", async () => {
    const calls: string[] = [];
    const input = { value: 1 };
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const database = createDatabase(
      {
        id: 11n,
        requestHash: hash,
        responseBody: { id: "existing" },
        expiresAt: new Date(Date.now() + 60_000),
      },
      calls,
    );
    const work = vi.fn(() => Promise.resolve({ id: "new" }));

    await expect(
      new IdempotencyExecutor(database, context).execute(
        "create",
        "live-key",
        input,
        responseSchema,
        work,
      ),
    ).resolves.toEqual({ id: "existing" });

    expect(work).not.toHaveBeenCalled();
    expect(calls).toEqual(["lock", "select"]);
  });
});
