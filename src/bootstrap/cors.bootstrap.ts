import { isAllowedOrigin, type CorsConfig } from "#/config/cors.config.js";
import type { ServerConfig } from "#/config/server.config.js";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

export const registerCors = async (
  app: FastifyInstance,
  config: CorsConfig & Pick<ServerConfig, "environment">,
): Promise<void> => {
  await app.register(cors, {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin, config)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    exposedHeaders: ["Content-Disposition", "ETag", "Retry-After", "X-Request-Id"],
  });
};
