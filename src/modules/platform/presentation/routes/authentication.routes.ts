import {
  acceptedResponseSchema,
  changePasswordSchema,
  confirmationResponseSchema,
  emailBodySchema,
  googleCallbackQuerySchema,
  loginResponseSchema,
  loginSchema,
  passwordChangedResponseSchema,
  passwordResetResponseSchema,
  registerResponseSchema,
  registerSchema,
  resetSchema,
  tokenSchema,
  type ChangePasswordInput,
  type EmailInput,
  type GoogleCallbackQuery,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type TokenInput,
} from "#/modules/platform/dtos/identity.dto.js";
import {
  csrfHeadersSchema,
  type CsrfHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import { authenticationControllers } from "#/modules/platform/factories/authentication.factory.js";
import { apiErrorResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const authenticationRoutes: FastifyPluginAsyncZod = (app) => {
  const csrf = app.csrfProtection.bind(app);
  app.get(
    "/auth/google",
    {
      config: { rateLimit: { max: 20, timeWindow: "5 minutes" } },
      schema: { operationId: "startGoogleAuthentication", tags: ["Identity"], security: [] },
    },
    (request, reply) => authenticationControllers.google.start(request, reply),
  );
  app.get<{ Querystring: GoogleCallbackQuery }>(
    "/auth/callback/google",
    {
      config: { rateLimit: { max: 20, timeWindow: "5 minutes" } },
      schema: {
        operationId: "completeGoogleAuthentication",
        tags: ["Identity"],
        security: [],
        querystring: googleCallbackQuerySchema,
        response: { 400: apiErrorResponseSchema, 503: apiErrorResponseSchema },
      },
    },
    (request, reply) => authenticationControllers.google.callback(request, reply),
  );
  app.post<{ Body: RegisterInput; Headers: CsrfHeaders }>(
    "/auth/register",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        operationId: "register",
        tags: ["Identity"],
        security: [],
        headers: csrfHeadersSchema,
        body: registerSchema,
        response: {
          201: registerResponseSchema,
          400: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => authenticationControllers.register.handle(request, reply),
  );
  app.post<{ Body: LoginInput; Headers: CsrfHeaders }>(
    "/auth/login",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
      schema: {
        operationId: "login",
        tags: ["Identity"],
        security: [],
        headers: csrfHeadersSchema,
        body: loginSchema,
        response: {
          200: loginResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => authenticationControllers.login.handle(request, reply),
  );
  app.post<{ Body: TokenInput; Headers: CsrfHeaders }>(
    "/auth/email/confirm",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
      schema: {
        operationId: "confirmEmail",
        tags: ["Identity"],
        security: [],
        headers: csrfHeadersSchema,
        body: tokenSchema,
        response: {
          200: confirmationResponseSchema,
          400: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request) => authenticationControllers.confirmEmail.handle(request),
  );
  app.post<{ Body: ChangePasswordInput; Headers: CsrfHeaders }>(
    "/auth/password/change",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        operationId: "changePassword",
        tags: ["Identity"],
        headers: csrfHeadersSchema,
        body: changePasswordSchema,
        response: {
          200: passwordChangedResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request) => authenticationControllers.changePassword.handle(request),
  );
  app.post<{ Body: EmailInput; Headers: CsrfHeaders }>(
    "/auth/email/resend",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
      schema: {
        operationId: "resendConfirmation",
        tags: ["Identity"],
        security: [],
        headers: csrfHeadersSchema,
        body: emailBodySchema,
        response: {
          200: acceptedResponseSchema,
          400: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
        },
      },
    },
    (request) => authenticationControllers.resendConfirmation.handle(request),
  );
  app.post<{ Body: EmailInput; Headers: CsrfHeaders }>(
    "/auth/password/forgot",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
      schema: {
        operationId: "requestPasswordReset",
        tags: ["Identity"],
        security: [],
        headers: csrfHeadersSchema,
        body: emailBodySchema,
        response: {
          200: acceptedResponseSchema,
          400: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
        },
      },
    },
    (request) => authenticationControllers.requestPasswordReset.handle(request),
  );
  app.post<{ Body: ResetPasswordInput; Headers: CsrfHeaders }>(
    "/auth/password/reset",
    {
      onRequest: csrf,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        operationId: "resetPassword",
        tags: ["Identity"],
        security: [],
        headers: csrfHeadersSchema,
        body: resetSchema,
        response: {
          200: passwordResetResponseSchema,
          400: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    (request) => authenticationControllers.resetPassword.handle(request),
  );
  return Promise.resolve();
};
