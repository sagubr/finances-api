import type { Database } from "#/infrastructure/database/db.provider.js";
import type {
  IOutboxRepository,
  OutboxRecord,
} from "#/modules/platform/application/ports/outbox.repository.js";
import { outboxEvents } from "#/modules/platform/infrastructure/database/platform.schema.js";
import { asc, eq, isNull, sql } from "drizzle-orm";

export class OutboxRepository implements IOutboxRepository {
  constructor(private readonly database: Database) {}

  listPending(limit: number): Promise<readonly OutboxRecord[]> {
    return this.database
      .select({
        id: outboxEvents.id,
        eventId: outboxEvents.eventId,
        eventName: outboxEvents.eventName,
        eventVersion: outboxEvents.eventVersion,
        workspaceId: outboxEvents.workspaceId,
        aggregateType: outboxEvents.aggregateType,
        aggregatePublicId: outboxEvents.aggregatePublicId,
        aggregateVersion: outboxEvents.aggregateVersion,
        correlationId: outboxEvents.correlationId,
        causationId: outboxEvents.causationId,
        payload: outboxEvents.payload,
        occurredAt: outboxEvents.occurredAt,
      })
      .from(outboxEvents)
      .where(isNull(outboxEvents.publishedAt))
      .orderBy(asc(outboxEvents.id))
      .limit(limit);
  }

  async markPublished(id: bigint): Promise<void> {
    await this.database
      .update(outboxEvents)
      .set({ publishedAt: new Date(), attempts: sql`${outboxEvents.attempts} + 1` })
      .where(eq(outboxEvents.id, id));
  }
}
