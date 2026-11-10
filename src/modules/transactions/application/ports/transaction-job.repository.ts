export type AutomaticSettlementResult = Readonly<{
  confirmed: number;
  settled: number;
}>;

export interface ITransactionJobRepository {
  settleOverdue(referenceOn: string): Promise<AutomaticSettlementResult>;
}
