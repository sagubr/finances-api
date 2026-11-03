import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { idempotencyRecords } from "#/modules/platform/infrastructure/database/platform.schema.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { and, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { z } from "zod";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
};

const requestHash = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

export class IdempotencyExecutor implements IIdempotencyExecutor {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
  ) {}

  async execute<T>(
    operation: string,
    key: string,
    input: unknown,
    responseSchema: z.ZodType<T>,
    work: () => Promise<T>,
  ): Promise<T> {
    const hash = requestHash(input);
    const lockKey = `${this.context.workspaceId}:${this.context.userId}:${operation}:${key}`;
    await this.database.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

    const now = new Date();
    const rows = await this.database
      .select({
        id: idempotencyRecords.id,
        requestHash: idempotencyRecords.requestHash,
        responseBody: idempotencyRecords.responseBody,
        expiresAt: idempotencyRecords.expiresAt,
      })
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.workspaceId, this.context.workspaceId),
          eq(idempotencyRecords.actorId, this.context.userId),
          eq(idempotencyRecords.operation, operation),
          eq(idempotencyRecords.key, key),
        ),
      )
      .limit(1);

    const persisted = rows[0];
    if (persisted && persisted.expiresAt <= now)
      await this.database.delete(idempotencyRecords).where(eq(idempotencyRecords.id, persisted.id));

    const record = persisted?.expiresAt && persisted.expiresAt > now ? persisted : undefined;
    if (record && record.requestHash !== hash)
      throw new ApplicationError("A chave já foi usada com outro conteúdo.", {
        category: "conflict",
        code: "IDEMPOTENCY_KEY_REUSED",
      });
    if (record?.responseBody !== null && record?.responseBody !== undefined)
      return responseSchema.parse(record.responseBody);
    if (record)
      throw new ApplicationError("A operação ainda está em andamento.", {
        category: "conflict",
        code: "IDEMPOTENCY_IN_PROGRESS",
      });

    await this.database.insert(idempotencyRecords).values({
      workspaceId: this.context.workspaceId,
      actorId: this.context.userId,
      operation,
      key,
      requestHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
    });

    const result = await work();
    await this.database
      .update(idempotencyRecords)
      .set({ responseStatus: 201, responseBody: result })
      .where(
        and(
          eq(idempotencyRecords.workspaceId, this.context.workspaceId),
          eq(idempotencyRecords.actorId, this.context.userId),
          eq(idempotencyRecords.operation, operation),
          eq(idempotencyRecords.key, key),
        ),
      );
    return result;
  }
}
