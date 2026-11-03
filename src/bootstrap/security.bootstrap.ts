import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export const registerSecurity = async (app: FastifyInstance): Promise<void> => {
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  });
};
