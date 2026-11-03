import type { GetCurrentSessionUseCase } from "#/modules/platform/application/use-cases/get-current-session.use-case.js";
import type { GetWorkspaceUseCase } from "#/modules/platform/application/use-cases/get-workspace.use-case.js";
import type { ListSessionsUseCase } from "#/modules/platform/application/use-cases/list-sessions.use-case.js";
import type { ListWorkspacesUseCase } from "#/modules/platform/application/use-cases/list-workspaces.use-case.js";
import type { LogoutUseCase } from "#/modules/platform/application/use-cases/logout.use-case.js";
import type { RevokeSessionUseCase } from "#/modules/platform/application/use-cases/revoke-session.use-case.js";
import type { SessionIdParams } from "#/modules/platform/dtos/identity.dto.js";
import { ApiError } from "#/shared/http/api.error.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

const sessionCookie = "finances_session";
const requireToken = (request: FastifyRequest): string => {
  const token = request.cookies[sessionCookie];
  if (token) return token;
  throw new ApiError("Entre para continuar.", {
    statusCode: 401,
    code: "AUTHENTICATION_REQUIRED",
  });
};

export class GetCsrfTokenController {
  handle(reply: FastifyReply) {
    return response({ token: reply.generateCsrf() });
  }
}

export class LogoutController {
  constructor(private readonly useCase: LogoutUseCase) {}
  async handle(request: FastifyRequest, reply: FastifyReply) {
    await this.useCase.execute(request.cookies[sessionCookie]);
    reply.clearCookie(sessionCookie, { path: "/" });
    return reply.status(204).send();
  }
}

export class GetCurrentSessionController {
  constructor(private readonly useCase: GetCurrentSessionUseCase) {}
  async handle(request: FastifyRequest) {
    const item = await this.useCase.execute(requireToken(request));
    return response({
      id: item.publicId,
      user: {
        id: item.userPublicId,
        email: item.email,
        displayName: item.displayName,
        emailConfirmed: item.isEmailConfirmed,
      },
      expiresAt: item.absoluteExpiresAt.toISOString(),
    });
  }
}

export class ListSessionsController {
  constructor(private readonly useCase: ListSessionsUseCase) {}
  async handle(request: FastifyRequest) {
    const items = await this.useCase.execute(requireToken(request));
    return response({
      items: items.map((item) => ({
        id: item.id,
        userAgent: item.userAgent,
        lastSeenAt: item.lastSeenAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        current: item.isCurrent,
      })),
    });
  }
}

export class RevokeSessionController {
  constructor(private readonly useCase: RevokeSessionUseCase) {}
  async handle(request: FastifyRequest<{ Params: SessionIdParams }>, reply: FastifyReply) {
    await this.useCase.execute(requireToken(request), request.params.id);
    return reply.status(204).send();
  }
}

export class ListWorkspacesController {
  constructor(private readonly useCase: ListWorkspacesUseCase) {}
  async handle(request: FastifyRequest) {
    const items = await this.useCase.execute(requireToken(request));
    return response({ items: items.map((item) => ({ ...item })) });
  }
}

export class GetWorkspaceController {
  constructor(private readonly useCase: GetWorkspaceUseCase) {}
  async handle(request: FastifyRequest<{ Params: SessionIdParams }>) {
    return response(await this.useCase.execute(requireToken(request), request.params.id));
  }
}
