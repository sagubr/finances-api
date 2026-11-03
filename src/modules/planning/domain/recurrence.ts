const parseDate = (date: string): Readonly<{ year: number; month: number; day: number }> => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError("Date must use YYYY-MM-DD.");

  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

const formatDate = (year: number, month: number, day: number): string =>
  `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export const addCalendarMonths = (date: string, months: number, preferredDay?: number): string => {
  if (!Number.isInteger(months)) throw new RangeError("Months must be an integer.");
  const current = parseDate(date);
  const targetIndex = current.year * 12 + current.month - 1 + months;
  const targetYear = Math.floor(targetIndex / 12);
  const targetMonth = (((targetIndex % 12) + 12) % 12) + 1;
  const day = Math.min(preferredDay ?? current.day, daysInMonth(targetYear, targetMonth));
  return formatDate(targetYear, targetMonth, day);
};

const addCalendarDays = (date: string, days: number): string => {
  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.valueOf()) || !Number.isInteger(days))
    throw new RangeError("Invalid day interval.");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const nextRecurrenceDate = (
  date: string,
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY",
  interval: number,
  preferredDay?: number,
): string => {
  if (!Number.isInteger(interval) || interval <= 0)
    throw new RangeError("Interval must be positive.");
  if (frequency === "WEEKLY") return addCalendarDays(date, interval * 7);
  if (frequency === "MONTHLY") return addCalendarMonths(date, interval, preferredDay);
  return addCalendarMonths(date, interval * 12, preferredDay);
};
