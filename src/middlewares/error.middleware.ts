import { ApplicationError } from "#/shared/application/application.error.js";
import { ApiError } from "#/shared/http/api.error.js";
import {
  toDiagnosticErrorLog,
  toSafeErrorLog,
} from "#/shared/observability/safe-error-log.js";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

const internalError = {
  success: false,
  message: "Não foi possível concluir a operação.",
  data: { code: "INTERNAL_SERVER_ERROR" },
} as const;

const errorLog = (error: unknown) =>
  process.env.NODE_ENV === "development"
    ? toDiagnosticErrorLog(error)
    : toSafeErrorLog(error);

const transientDatabaseCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "57P01",
  "57P02",
  "57P03",
]);

const clientErrorMessages = new Map<string, string>([
  ["FST_CSRF_MISSING_SECRET", "Token CSRF ausente ou inválido."],
  ["FST_CSRF_INVALID_TOKEN", "Token CSRF ausente ou inválido."],
  ["FST_ERR_CTP_INVALID_MEDIA_TYPE", "Tipo de conteúdo não suportado."],
  ["FST_ERR_CTP_BODY_TOO_LARGE", "O corpo da requisição excede o limite permitido."],
  ["FST_ERR_RATE_LIMIT", "Limite de requisições excedido."],
]);

const statusByApplicationCategory = {
  validation: 422,
  unauthenticated: 401,
  forbidden: 403,
  "not-found": 404,
  conflict: 409,
  "rate-limit": 429,
  unavailable: 503,
} as const;

const databaseClientErrors = new Map<
  string,
  Readonly<{ statusCode: 400 | 409 | 422; code: string; message: string }>
>([
  [
    "23505",
    { statusCode: 409, code: "RESOURCE_CONFLICT", message: "Já existe um recurso equivalente." },
  ],
  [
    "23503",
    {
      statusCode: 422,
      code: "REFERENCE_INVALID",
      message: "Uma referência informada não é válida.",
    },
  ],
  [
    "23514",
    {
      statusCode: 422,
      code: "CONSTRAINT_VIOLATION",
      message: "Os dados violam uma regra de negócio.",
    },
  ],
  [
    "22P02",
    { statusCode: 400, code: "VALIDATION_ERROR", message: "Verifique os dados informados." },
  ],
]);

const errorCode = (error: Error): string | undefined => {
  if (!("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
};

export const errorHandler = (
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      data: {
        code: error.code,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId: request.id,
      },
    });
  }

  if (error instanceof ApplicationError) {
    return reply.status(statusByApplicationCategory[error.category]).send({
      success: false,
      message: error.message,
      data: {
        code: error.code,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId: request.id,
      },
    });
  }

  if ("validation" in error && error.validation) {
    return reply.status(400).send({
      success: false,
      message: "Verifique os dados informados.",
      data: {
        code: "VALIDATION_ERROR",
        details: error.validation,
        requestId: request.id,
      },
    });
  }

  const databaseClientError = databaseClientErrors.get(errorCode(error) ?? "");
  if (databaseClientError) {
    request.log.warn({ error: errorLog(error) }, "Database rejected client input");
    return reply.status(databaseClientError.statusCode).send({
      success: false,
      message: databaseClientError.message,
      data: { code: databaseClientError.code, requestId: request.id },
    });
  }

  if (transientDatabaseCodes.has(errorCode(error) ?? "")) {
    request.log.error({ error: errorLog(error) }, "Transient database error");
    return reply.status(503).send({
      success: false,
      message: "Conexão temporariamente indisponível.",
      data: { code: "DATABASE_UNAVAILABLE", requestId: request.id },
    });
  }

  const statusCode = "statusCode" in error ? error.statusCode : undefined;
  if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
    const code = errorCode(error) ?? "REQUEST_ERROR";
    return reply.status(statusCode).send({
      success: false,
      message: clientErrorMessages.get(code) ?? "Não foi possível processar a requisição.",
      data: { code, requestId: request.id },
    });
  }

  request.log.error({ error: errorLog(error) }, "Unhandled request error");
  return reply.status(500).send({
    ...internalError,
    data: { ...internalError.data, requestId: request.id },
  });
};
