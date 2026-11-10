import type {
  ListTransactionsQuery,
  TransactionInput,
  TransactionMapQuery,
  TransactionMapView,
  TransactionPatch,
  TransactionView,
  TransferInput,
  TransferView,
} from "#/modules/transactions/dtos/transaction.dto.js";

export type TransactionPage = Readonly<{
  items: readonly TransactionView[];
  pageInfo: Readonly<{ nextCursor: string | null; hasNextPage: boolean }>;
}>;
export type MonthlyTransactionEntry = Readonly<{
  type: TransactionView["type"];
  status: TransactionView["status"];
  amountCents: bigint;
  deleted: boolean;
}>;

export interface ITransactionRepository {
  list(query: ListTransactionsQuery): Promise<TransactionPage>;
  map(query: TransactionMapQuery): Promise<TransactionMapView>;
  find(publicId: string): Promise<TransactionView>;
  create(publicId: string, input: TransactionInput): Promise<TransactionView>;
  update(publicId: string, input: TransactionPatch): Promise<TransactionView>;
  changeStatus(
    publicId: string,
    expectedVersion: number,
    status: "CONFIRMED" | "SETTLED",
  ): Promise<TransactionView>;
  revertStatus(publicId: string, expectedVersion: number): Promise<TransactionView>;
  delete(publicId: string, expectedVersion: number): Promise<void>;
  restore(publicId: string, expectedVersion: number): Promise<TransactionView>;
  createTransfer(
    ids: Readonly<{ pair: string; debit: string; credit: string }>,
    input: TransferInput,
  ): Promise<TransferView>;
  listMonthlyEntries(month: string): Promise<readonly MonthlyTransactionEntry[]>;
}
