const monthsBetween = (start: string, end: string): number => {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()) || endDate < startDate)
    throw new RangeError("Invalid depreciation period.");

  const wholeMonths =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    endDate.getUTCMonth() -
    startDate.getUTCMonth();
  return Math.max(0, wholeMonths - (endDate.getUTCDate() < startDate.getUTCDate() ? 1 : 0));
};

export const calculateLinearDepreciation = (
  input: Readonly<{
    costCents: bigint;
    residualCents: bigint;
    usefulLifeMonths: number;
    acquiredOn: string;
    referenceOn: string;
  }>,
): bigint => {
  if (input.costCents < 0n || input.residualCents < 0n || input.residualCents > input.costCents)
    throw new RangeError("Invalid asset values.");
  if (!Number.isInteger(input.usefulLifeMonths) || input.usefulLifeMonths <= 0)
    throw new RangeError("Useful life must be positive.");

  const elapsed = Math.min(
    monthsBetween(input.acquiredOn, input.referenceOn),
    input.usefulLifeMonths,
  );
  const depreciable = input.costCents - input.residualCents;
  const depreciation = (depreciable * BigInt(elapsed)) / BigInt(input.usefulLifeMonths);
  return input.costCents - depreciation;
};
