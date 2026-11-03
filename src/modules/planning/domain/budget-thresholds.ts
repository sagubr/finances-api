const thresholdsBps = [8_000, 10_000] as const;

export const reachedBudgetThresholds = (
  realizedCents: bigint,
  limitCents: bigint,
): Readonly<{ consumptionBps: number | null; thresholds: readonly number[] }> => {
  if (limitCents === 0n) return { consumptionBps: null, thresholds: [] };
  const consumptionBps = Number((realizedCents * 10_000n + limitCents / 2n) / limitCents);
  return {
    consumptionBps,
    thresholds: thresholdsBps.filter((threshold) => consumptionBps >= threshold),
  };
};
