const safeIdentifier = /^[A-Za-z0-9_.:-]{1,128}$/;

const readSafeProperty = (error: unknown, property: string): string | undefined => {
  if (typeof error !== "object" || error === null || !(property in error)) return undefined;
  const value = (error as Record<string, unknown>)[property];
  return typeof value === "string" && safeIdentifier.test(value) ? value : undefined;
};

export type SafeErrorLog = Readonly<{
  name: string;
  code?: string;
  constraint?: string;
  table?: string;
}>;

export const toSafeErrorLog = (error: unknown): SafeErrorLog => {
  const name = error instanceof Error && safeIdentifier.test(error.name) ? error.name : "Error";
  const code = readSafeProperty(error, "code");
  const constraint = readSafeProperty(error, "constraint");
  const table = readSafeProperty(error, "table");
  return {
    name,
    ...(code ? { code } : {}),
    ...(constraint ? { constraint } : {}),
    ...(table ? { table } : {}),
  };
};

const diagnosticTextLimit = 8_000;

const sanitizeDiagnosticText = (value: string): string =>
  value
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^@\s/]+)@/gi, "$1[REDACTED]@")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/(password|secret|token|authorization)(\s*[=:]\s*)([^\s,;]+)/gi, "$1$2[REDACTED]")
    .replace(/(Key\s+\([^)]+\)\s*=\s*)\([^)]+\)/gi, "$1([REDACTED])")
    .replace(/(^|\n)params:[^\n]*/gi, "$1params: [REDACTED]")
    .slice(0, diagnosticTextLimit);

export type DiagnosticErrorLog = Readonly<{
  name: string;
  message?: string;
  stack?: string;
  code?: string;
  constraint?: string;
  table?: string;
  cause?: DiagnosticErrorLog;
}>;

export const toDiagnosticErrorLog = (error: unknown, depth = 0): DiagnosticErrorLog => {
  const safe = toSafeErrorLog(error);
  if (!(error instanceof Error)) {
    return {
      ...safe,
      ...(typeof error === "string" ? { message: sanitizeDiagnosticText(error) } : {}),
    };
  }

  const cause = "cause" in error ? error.cause : undefined;
  return {
    ...safe,
    ...(error.message ? { message: sanitizeDiagnosticText(error.message) } : {}),
    ...(error.stack ? { stack: sanitizeDiagnosticText(error.stack) } : {}),
    ...(cause !== undefined && depth < 3 ? { cause: toDiagnosticErrorLog(cause, depth + 1) } : {}),
  };
};
