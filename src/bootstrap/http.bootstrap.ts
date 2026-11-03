import type { AuthConfig } from "#/config/auth.config.js";
import type { ServerConfig } from "#/config/server.config.js";
import cookie from "@fastify/cookie";
import csrfProtection from "@fastify/csrf-protection";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import type { FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

const developmentCookieSecret = "finances-development-cookie-secret-change-me";

export const registerHttpFoundation = async (
  app: FastifyInstance,
  config: Pick<AuthConfig, "cookieSecret"> & Pick<ServerConfig, "environment">,
): Promise<void> => {
  await app.register(sensible);
  await app.register(cookie, {
    secret: config.cookieSecret ?? developmentCookieSecret,
    hook: "onRequest",
  });
  await app.register(csrfProtection, {
    sessionPlugin: "@fastify/cookie",
    cookieOpts: {
      httpOnly: true,
      sameSite: "strict",
      secure: config.environment === "production",
      path: "/",
    },
    getToken: (request) => request.headers["x-csrf-token"] as string | undefined,
  });
  await app.register(rateLimit, { global: false, max: 100, timeWindow: "1 minute" });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
};
