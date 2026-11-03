import type { z } from "zod";

export interface IIdempotencyExecutor {
  execute<T>(
    operation: string,
    key: string,
    input: unknown,
    responseSchema: z.ZodType<T>,
    work: () => Promise<T>,
  ): Promise<T>;
}
