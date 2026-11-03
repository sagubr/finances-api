import type { ServerConfig } from "#/config/server.config.js";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const registerSwagger = async (
  app: FastifyInstance,
  config: Pick<ServerConfig, "environment">,
): Promise<void> => {
  if (config.environment === "production") return;
  const [{ default: swagger }, { default: swaggerUi }] = await Promise.all([
    import("@fastify/swagger"),
    import("@fastify/swagger-ui"),
  ]);
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Finances API",
        version: "0.1.0",
        description: "Contratos HTTP da plataforma Finances.",
      },
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "finances_session",
            description: "Sessão HTTP-only criada pelo login.",
          },
        },
      },
      security: [{ sessionCookie: [] }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  app.get("/openapi.json", { schema: { hide: true } }, () => app.swagger());
};
