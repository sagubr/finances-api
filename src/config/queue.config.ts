import { env, type Environment } from "#/config/env.config.js";

export type QueueConfig = Readonly<{ redisUrl?: string }>;

export const createQueueConfig = (value: Environment): QueueConfig => {
  if (!value.REDIS_URL) return {};
  const url = new URL(value.REDIS_URL);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:")
    throw new Error("REDIS_URL must use the redis or rediss protocol.");
  return { redisUrl: value.REDIS_URL };
};

export const queueConfig = createQueueConfig(env);
