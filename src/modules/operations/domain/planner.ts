export type PlannerSlot = Readonly<{
  weekday: number;
  startMinute: number;
  durationMinutes: number;
}>;

export const assertNonOverlappingSlots = (slots: readonly PlannerSlot[]): void => {
  const sorted = [...slots].sort(
    (left, right) => left.weekday - right.weekday || left.startMinute - right.startMinute,
  );
  sorted.forEach((slot, index) => {
    if (
      !Number.isInteger(slot.weekday) ||
      slot.weekday < 0 ||
      slot.weekday > 6 ||
      slot.startMinute < 0 ||
      slot.durationMinutes <= 0 ||
      slot.startMinute + slot.durationMinutes > 1440
    ) {
      throw new RangeError("Invalid planner slot.");
    }

    const previous = sorted[index - 1];
    if (
      previous &&
      previous.weekday === slot.weekday &&
      previous.startMinute + previous.durationMinutes > slot.startMinute
    ) {
      throw new RangeError("Planner slots overlap.");
    }
  });
};
