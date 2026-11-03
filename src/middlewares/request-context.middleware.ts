import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { workspaceHeadersSchema } from "#/modules/platform/dtos/request-context.dto.js";
import { ApiError } from "#/shared/http/api.error.js";
import type { FastifyRequest } from "fastify";
import { createHash } from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    requestContext?: RequestContext;
  }
}

const sessionCookie = "finances_session";
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export const createRequestContextMiddleware =
  (resolver: IRequestContextResolver) =>
  async (request: FastifyRequest): Promise<void> => {
    const sessionToken = request.cookies[sessionCookie];
    if (!sessionToken)
      throw new ApiError("Entre para continuar.", {
        statusCode: 401,
        code: "AUTHENTICATION_REQUIRED",
      });
    const headers = workspaceHeadersSchema.safeParse(request.headers);
    if (!headers.success)
      throw new ApiError("Selecione um workspace.", {
        statusCode: 400,
        code: "WORKSPACE_INVALID",
        details: headers.error.issues,
      });
    request.requestContext = await resolver.resolve({
      sessionTokenHash: sha256(sessionToken),
      workspacePublicId: headers.data["x-workspace"],
      requestId: request.id,
    });
  };
