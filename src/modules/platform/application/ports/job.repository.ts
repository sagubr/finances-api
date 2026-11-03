export type JobRecord = Readonly<{
  id: bigint;
  publicId: string;
  workspaceId: bigint | null;
  name: string;
  payload: unknown;
  attempts: number;
}>;

export type ScheduledJob = Readonly<{
  publicId: string;
  workspaceId: bigint;
  name: string;
  executionKey: string;
  payload: unknown;
}>;

export interface IJobRepository {
  claim(): Promise<JobRecord | null>;
  complete(id: bigint): Promise<void>;
  fail(id: bigint, attempts: number, errorCode: string): Promise<void>;
}

export interface IScheduledJobRepository {
  schedule(jobs: readonly ScheduledJob[]): Promise<void>;
}
