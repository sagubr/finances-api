export type SummaryTransaction = Readonly<{
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "CARD_PAYMENT" | "INVESTMENT";
  status: "PLANNED" | "CONFIRMED" | "SETTLED";
  amountCents: bigint;
  deleted: boolean;
}>;

export type MonthlySummary = Readonly<{
  incomeCents: bigint;
  expenseCents: bigint;
  plannedIncomeCents: bigint;
  plannedExpenseCents: bigint;
  plannedCardPaymentCents: bigint;
  netCents: bigint;
  plannedNetCents: bigint;
}>;

export const calculateMonthlySummary = (items: readonly SummaryTransaction[]): MonthlySummary =>
  items.reduce<MonthlySummary>(
    (summary, item) => {
      if (item.deleted || item.type === "TRANSFER") return summary;
      if (item.type === "CARD_PAYMENT")
        return item.status === "PLANNED"
          ? {
              ...summary,
              plannedCardPaymentCents: summary.plannedCardPaymentCents + item.amountCents,
            }
          : summary;

      if (item.status === "PLANNED") {
        if (item.type === "INCOME") {
          return {
            ...summary,
            plannedIncomeCents: summary.plannedIncomeCents + item.amountCents,
            plannedNetCents: summary.plannedNetCents + item.amountCents,
          };
        }

        if (item.type === "EXPENSE") {
          return {
            ...summary,
            plannedExpenseCents: summary.plannedExpenseCents + item.amountCents,
            plannedNetCents: summary.plannedNetCents - item.amountCents,
          };
        }

        return summary;
      }

      if (item.type === "INCOME") {
        return {
          ...summary,
          incomeCents: summary.incomeCents + item.amountCents,
          netCents: summary.netCents + item.amountCents,
        };
      }

      if (item.type === "EXPENSE") {
        return {
          ...summary,
          expenseCents: summary.expenseCents + item.amountCents,
          netCents: summary.netCents - item.amountCents,
        };
      }

      return summary;
    },
    {
      incomeCents: 0n,
      expenseCents: 0n,
      plannedIncomeCents: 0n,
      plannedExpenseCents: 0n,
      plannedCardPaymentCents: 0n,
      netCents: 0n,
      plannedNetCents: 0n,
    },
  );
