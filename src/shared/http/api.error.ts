import {
  ApplicationError,
  type ApplicationErrorCategory,
} from "#/shared/application/application.error.js";

export type ApiErrorOptions = Readonly<{
  code: string;
  statusCode: number;
  details?: unknown;
  cause?: unknown;
}>;

const categoryByStatus = new Map<number, ApplicationErrorCategory>([
  [400, "validation"],
  [401, "unauthenticated"],
  [403, "forbidden"],
  [404, "not-found"],
  [409, "conflict"],
  [422, "validation"],
  [429, "rate-limit"],
  [503, "unavailable"],
]);

export class ApiError extends ApplicationError {
  readonly statusCode: number;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, {
      code: options.code,
      category: categoryByStatus.get(options.statusCode) ?? "validation",
      ...(options.details === undefined ? {} : { details: options.details }),
      ...(options.cause === undefined ? {} : { cause: options.cause }),
    });
    this.statusCode = options.statusCode;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Recurso não encontrado.") {
    super(message, { code: "RESOURCE_NOT_FOUND", statusCode: 404 });
  }
}
