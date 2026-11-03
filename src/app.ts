import { apiRoutes } from "#/bootstrap/api.routes.js";
import { createFastifyApplication } from "#/bootstrap/fastify.factory.js";
import { registerPlatform } from "#/bootstrap/platform.bootstrap.js";
import { runtimeConfig, type RuntimeConfig } from "#/config/runtime.config.js";
import { errorHandler } from "#/middlewares/error.middleware.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import { requestContextResolver } from "#/modules/platform/providers/request-context-resolver.provider.js";
import type { FastifyInstance } from "fastify";

export type BuildAppOptions = Readonly<{
  config?: RuntimeConfig;
  requestContextResolver?: IRequestContextResolver;
}>;

export const buildApp = async (options: BuildAppOptions = {}): Promise<FastifyInstance> => {
  const config = options.config ?? runtimeConfig;
  const contextResolver = options.requestContextResolver ?? requestContextResolver;
  const app = createFastifyApplication({
    logLevel: config.logLevel,
    trustProxy: config.trustProxy,
  });

  await registerPlatform(app, config);
  app.setErrorHandler(errorHandler);
  await app.register(apiRoutes, {
    prefix: "/api/v1",
    requestContextResolver: contextResolver,
  });

  return app;
};
