import type { IEventPublisher } from "#/modules/platform/application/ports/event.publisher.js";
import type { OutboxRecord } from "#/modules/platform/application/ports/outbox.repository.js";
import type { SendIdentityEmailUseCase } from "#/modules/platform/application/use-cases/send-identity-email.use-case.js";

export class RoutingEventPublisher implements IEventPublisher {
  constructor(
    private readonly identityEmail: SendIdentityEmailUseCase,
    private readonly fallback: IEventPublisher,
  ) {}

  publish(event: OutboxRecord): Promise<void> {
    if (event.eventName === "IdentityEmailRequested")
      return this.identityEmail.execute(event.eventId, event.payload);
    return this.fallback.publish(event);
  }

  close(): Promise<void> {
    return this.fallback.close();
  }
}
