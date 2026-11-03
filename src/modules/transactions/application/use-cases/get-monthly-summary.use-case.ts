import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { calculateMonthlySummary } from "#/modules/transactions/domain/monthly-summary.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

const safeMoney = (value: bigint): number => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount))
    throw new Error("Aggregated monetary value exceeds safe range.");
  return amount;
};

export class GetMonthlySummaryUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}
  async execute(context: RequestContext, month: string) {
    const entries = await this.unitOfWork.run(context, ({ transactions }) =>
      transactions.listMonthlyEntries(month),
    );
    const summary = calculateMonthlySummary(entries);
    return {
      month,
      incomeCents: safeMoney(summary.incomeCents),
      expenseCents: safeMoney(summary.expenseCents),
      plannedIncomeCents: safeMoney(summary.plannedIncomeCents),
      plannedExpenseCents: safeMoney(summary.plannedExpenseCents),
      plannedCardPaymentCents: safeMoney(summary.plannedCardPaymentCents),
      netCents: safeMoney(summary.netCents),
      plannedNetCents: safeMoney(summary.plannedNetCents),
    };
  }
}
