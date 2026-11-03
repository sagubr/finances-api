const safeIdentifier = /^[A-Za-z0-9_.:-]{1,128}$/;

const readSafeProperty = (error: unknown, property: string): string | undefined => {
  if (typeof error !== "object" || error === null || !(property in error)) return undefined;
  const value = (error as Record<string, unknown>)[property];
  return typeof value === "string" && safeIdentifier.test(value) ? value : undefined;
};

export const toSafeErrorLog = (error: unknown): Readonly<Record<string, string>> => {
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
