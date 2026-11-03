import { z } from "zod";

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const civilDatePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const isCalendarDate = (value: string): boolean => {
  if (!civilDatePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

const isIanaTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const publicIdSchema = z.string().regex(uuidV7Pattern, "Expected a UUIDv7 identifier.");
export const civilDateSchema = z
  .string()
  .refine(isCalendarDate, "Expected a valid YYYY-MM-DD date.");
export const competenceMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const ianaTimezoneSchema = z
  .string()
  .min(1)
  .max(80)
  .refine(isIanaTimezone, "Invalid IANA timezone.");
export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[\x21-\x7e]+$/, "Idempotency key must use visible ASCII characters.");
