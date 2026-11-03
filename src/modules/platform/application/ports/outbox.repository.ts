export type OutboxRecord = Readonly<{
  id: bigint;
  eventId: string;
  eventName: string;
  eventVersion: number;
  workspaceId: bigint | null;
  aggregateType: string;
  aggregatePublicId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string | null;
  payload: unknown;
  occurredAt: Date;
}>;

export interface IOutboxRepository {
  listPending(limit: number): Promise<readonly OutboxRecord[]>;
  markPublished(id: bigint): Promise<void>;
}
