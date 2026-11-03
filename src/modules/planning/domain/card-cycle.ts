import { addCalendarMonths } from "#/modules/planning/domain/recurrence.js";

const validDate = (year: number, month: number, preferredDay: number): string => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${Math.min(preferredDay, lastDay).toString().padStart(2, "0")}`;
};

const parts = (date: string): Readonly<{ year: number; month: number; day: number }> => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError("Date must use YYYY-MM-DD.");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

const addDay = (date: string): string => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

export type CardCycle = Readonly<{ startsOn: string; endsOn: string; dueOn: string }>;

export const resolveCardCycle = (
  occurredOn: string,
  closingDay: number,
  dueDay: number,
): CardCycle => {
  if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
    throw new RangeError("Closing day must be between 1 and 31.");
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new RangeError("Due day must be between 1 and 31.");
  }

  const current = parts(occurredOn);
  const currentClosing = validDate(current.year, current.month, closingDay);
  const endsOn =
    occurredOn <= currentClosing
      ? currentClosing
      : addCalendarMonths(currentClosing, 1, closingDay);
  const previousEnd = addCalendarMonths(endsOn, -1, closingDay);
  const startsOn = addDay(previousEnd);
  const end = parts(endsOn);
  const dueMonthOffset = dueDay > end.day ? 0 : 1;
  const dueAnchor = addCalendarMonths(endsOn, dueMonthOffset, dueDay);
  const due = parts(dueAnchor);
  return { startsOn, endsOn, dueOn: validDate(due.year, due.month, dueDay) };
};
