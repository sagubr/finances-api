export const splitInstallments = (totalCents: bigint, count: number): readonly bigint[] => {
  if (totalCents <= 0n) throw new RangeError("Total must be positive.");
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("Installment count must be a positive integer.");

  const divisor = BigInt(count);
  const base = totalCents / divisor;
  const remainder = totalCents % divisor;

  return Array.from({ length: count }, (_, index) => base + (BigInt(index) < remainder ? 1n : 0n));
};
