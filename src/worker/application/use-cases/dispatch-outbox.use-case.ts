import type { IEventPublisher } from "#/modules/platform/application/ports/event.publisher.js";
import type { IOutboxRepository } from "#/modules/platform/application/ports/outbox.repository.js";

export class DispatchOutboxUseCase {
  constructor(
    private readonly outbox: IOutboxRepository,
    private readonly publisher: IEventPublisher,
  ) {}

  async execute(): Promise<number> {
    const events = await this.outbox.listPending(100);
    for (const event of events) {
      await this.publisher.publish(event);
      await this.outbox.markPublished(event.id);
    }
    return events.length;
  }
}
