import type { OutboxRecord } from "./outbox.repository.js";

export interface IEventPublisher {
  publish(event: OutboxRecord): Promise<void>;
  close(): Promise<void>;
}
