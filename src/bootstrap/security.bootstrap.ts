import type { ServerConfig } from "#/config/server.config.js";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export const registerSecurity = async (
  app: FastifyInstance,
  config: Pick<ServerConfig, "environment">,
): Promise<void> => {
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy:
      config.environment === "production"
        ? {
            directives: {
              defaultSrc: ["'none'"],
              baseUri: ["'none'"],
              formAction: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
  });
};
