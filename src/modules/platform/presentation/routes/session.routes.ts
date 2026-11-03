import {
  csrfResponseSchema,
  currentSessionResponseSchema,
  sessionIdParamsSchema,
  sessionListResponseSchema,
  workspaceListResponseSchema,
  workspaceResponseSchema,
  type SessionIdParams,
} from "#/modules/platform/dtos/identity.dto.js";
import {
  csrfHeadersSchema,
  type CsrfHeaders,
} from "#/modules/platform/dtos/request-context.dto.js";
import { sessionControllers } from "#/modules/platform/factories/session.factory.js";
import { apiErrorResponseSchema, noContentResponseSchema } from "#/shared/http/error.dto.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const sessionRoutes: FastifyPluginAsyncZod = (app) => {
  const csrf = app.csrfProtection.bind(app);
  app.get(
    "/auth/csrf",
    {
      schema: {
        operationId: "getCsrfToken",
        tags: ["Identity"],
        security: [],
        response: { 200: csrfResponseSchema },
      },
    },
    (_request, reply) => sessionControllers.csrf.handle(reply),
  );
  app.post<{ Headers: CsrfHeaders }>(
    "/auth/logout",
    {
      onRequest: csrf,
      schema: {
        operationId: "logout",
        tags: ["Identity"],
        headers: csrfHeadersSchema,
        response: { 204: noContentResponseSchema, 403: apiErrorResponseSchema },
      },
    },
    (request, reply) => sessionControllers.logout.handle(request, reply),
  );
  app.get(
    "/auth/session",
    {
      schema: {
        operationId: "getCurrentSession",
        tags: ["Identity"],
        response: { 200: currentSessionResponseSchema, 401: apiErrorResponseSchema },
      },
    },
    (request) => sessionControllers.current.handle(request),
  );
  app.get(
    "/auth/sessions",
    {
      schema: {
        operationId: "listSessions",
        tags: ["Identity"],
        response: { 200: sessionListResponseSchema, 401: apiErrorResponseSchema },
      },
    },
    (request) => sessionControllers.list.handle(request),
  );
  app.delete<{ Params: SessionIdParams; Headers: CsrfHeaders }>(
    "/auth/sessions/:id",
    {
      onRequest: csrf,
      schema: {
        operationId: "revokeSession",
        tags: ["Identity"],
        headers: csrfHeadersSchema,
        params: sessionIdParamsSchema,
        response: {
          204: noContentResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
        },
      },
    },
    (request, reply) => sessionControllers.revoke.handle(request, reply),
  );
  app.get(
    "/workspaces",
    {
      schema: {
        operationId: "listWorkspaces",
        tags: ["Workspaces"],
        response: { 200: workspaceListResponseSchema, 401: apiErrorResponseSchema },
      },
    },
    (request) => sessionControllers.workspaces.handle(request),
  );
  app.get<{ Params: SessionIdParams }>(
    "/workspaces/:id",
    {
      schema: {
        operationId: "getWorkspace",
        tags: ["Workspaces"],
        params: sessionIdParamsSchema,
        response: {
          200: workspaceResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
        },
      },
    },
    (request) => sessionControllers.workspace.handle(request),
  );
  return Promise.resolve();
};
