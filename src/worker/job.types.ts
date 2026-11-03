export type JobRow = Readonly<{
  id: string;
  public_id: string;
  workspace_id: string | null;
  job_name: string;
  payload: unknown;
  attempts: number;
}>;

export const requirePayloadId = (payload: unknown, key: string): string => {
  if (!payload || typeof payload !== "object" || !(key in payload))
    throw new Error(`Job payload is missing ${key}.`);
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value !== "string") throw new Error(`Job payload ${key} must be a string.`);
  return value;
};
