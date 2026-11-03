import { env, type Environment } from "#/config/env.config.js";

export type QueueConfig = Readonly<{ redisUrl?: string }>;

export const createQueueConfig = (value: Environment): QueueConfig => {
  return value.REDIS_URL ? { redisUrl: value.REDIS_URL } : {};
};

export const queueConfig = createQueueConfig(env);
