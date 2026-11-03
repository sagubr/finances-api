import { healthController as controller } from "#/modules/health/health.controller.js";
import { healthResponseSchema } from "#/modules/health/health.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const healthRoutes: FastifyPluginAsyncZod = (app) => {
  app.get(
    "/health",
    {
      schema: {
        operationId: "getHealth",
        tags: ["Health"],
        security: [],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => reply.send(controller.liveness()),
  );

  return Promise.resolve();
};
