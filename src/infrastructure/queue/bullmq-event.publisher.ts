import type { IEventPublisher } from "#/modules/platform/application/ports/event.publisher.js";
import type { OutboxRecord } from "#/modules/platform/application/ports/outbox.repository.js";
import { Queue, type ConnectionOptions } from "bullmq";

const connectionFromUrl = (value: string): ConnectionOptions => {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.pathname.length > 1 ? { db: Number(url.pathname.slice(1)) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
};

export class BullMqEventPublisher implements IEventPublisher {
  private readonly queue: Queue;

  constructor(redisUrl: string) {
    this.queue = new Queue("finances-events", { connection: connectionFromUrl(redisUrl) });
  }

  async publish(event: OutboxRecord): Promise<void> {
    await this.queue.add(
      event.eventName,
      {
        eventId: event.eventId,
        event: event.eventName,
        version: event.eventVersion,
        occurredAt: event.occurredAt.toISOString(),
        workspaceId: event.workspaceId?.toString() ?? null,
        aggregate: {
          type: event.aggregateType,
          id: event.aggregatePublicId,
          version: event.aggregateVersion,
        },
        correlationId: event.correlationId,
        causationId: event.causationId,
        payload: event.payload,
      },
      { jobId: event.eventId, removeOnComplete: 1_000, removeOnFail: 5_000 },
    );
  }

  close(): Promise<void> {
    return this.queue.close();
  }
}
