export type ApplicationErrorCategory =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "unavailable";

export type ApplicationErrorOptions = Readonly<{
  code: string;
  category: ApplicationErrorCategory;
  details?: unknown;
  cause?: unknown;
}>;

export class ApplicationError extends Error {
  readonly code: string;
  readonly category: ApplicationErrorCategory;
  readonly details?: unknown;

  constructor(message: string, options: ApplicationErrorOptions) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.category = options.category;
    this.details = options.details;
  }
}
