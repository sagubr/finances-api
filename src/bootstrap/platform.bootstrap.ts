import type { RuntimeConfig } from "#/config/runtime.config.js";
import type { FastifyInstance } from "fastify";
import { registerCors } from "./cors.bootstrap.js";
import { registerHttpFoundation } from "./http.bootstrap.js";
import { registerSecurity } from "./security.bootstrap.js";
import { registerSwagger } from "./swagger.bootstrap.js";

export const registerPlatform = async (
  app: FastifyInstance,
  config: RuntimeConfig,
): Promise<void> => {
  await registerCors(app, config);
  await registerSecurity(app);
  await registerHttpFoundation(app, config);
  await registerSwagger(app, config);
};
