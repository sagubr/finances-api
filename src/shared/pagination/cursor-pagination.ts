import { z } from "zod";

const decode = (cursor: string): string => Buffer.from(cursor, "base64url").toString("utf8");
const isCanonicalCursor = (cursor: string): boolean => {
  const decoded = decode(cursor);
  return (
    decoded.length > 0 &&
    decoded.length <= 128 &&
    /^[A-Za-z0-9|:._-]+$/.test(decoded) &&
    Buffer.from(decoded, "utf8").toString("base64url") === cursor
  );
};

export const cursorSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/)
  .refine(isCanonicalCursor, "Invalid cursor.");

export const cursorPaginationQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const pageInfoSchema = z.object({
  nextCursor: cursorSchema.nullable(),
  hasNextPage: z.boolean(),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
export type CursorPage<T> = Readonly<{
  items: readonly T[];
  pageInfo: Readonly<{ nextCursor: string | null; hasNextPage: boolean }>;
}>;

export const decodeCursor = (cursor: string | undefined): string | undefined =>
  cursor ? decode(cursor) : undefined;

export const encodeCompositeCursor = (...parts: readonly string[]): string =>
  parts.map((part) => Buffer.from(part, "utf8").toString("base64url")).join(".");

export const decodeCompositeCursor = (
  cursor: string | undefined,
  expectedParts: number,
): readonly string[] | null => {
  const encodedParts = decodeCursor(cursor)?.split(".");
  if (!encodedParts || encodedParts.length !== expectedParts || encodedParts.some((part) => !part))
    return null;
  const parts = encodedParts.map((part) => Buffer.from(part, "base64url").toString("utf8"));
  return parts.every(
    (part, index) => Buffer.from(part, "utf8").toString("base64url") === encodedParts[index],
  )
    ? parts
    : null;
};

export const createCursorPage = <T>(
  rows: readonly T[],
  limit: number,
  getCursor: (item: T) => string = (item) => (item as Readonly<{ id: string }>).id,
): CursorPage<T> => {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : [...rows];
  const last = items.at(-1);
  return {
    items,
    pageInfo: {
      hasNextPage,
      nextCursor:
        hasNextPage && last ? Buffer.from(getCursor(last), "utf8").toString("base64url") : null,
    },
  };
};
