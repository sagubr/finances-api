export type ReportExportRecord = Readonly<{
  id: bigint;
  report: string;
  format: "CSV" | "XLSX" | "PDF" | "JSON";
  filters: unknown;
}>;

export type ExportTransactionRow = Readonly<{
  publicId: string;
  type: string;
  status: string;
  amountCents: bigint;
  currency: string;
  description: string;
  occurredOn: string;
  competenceMonth: string;
}>;

export type ExportAnnualRow = Readonly<{
  month: string;
  incomeCents: bigint;
  expenseCents: bigint;
}>;

export interface IReportExportJobRepository {
  claim(publicId: string): Promise<ReportExportRecord | null>;
  listTransactions(): Promise<readonly ExportTransactionRow[]>;
  getAnnualRows(): Promise<readonly ExportAnnualRow[]>;
  markReady(
    id: bigint,
    artifact: Readonly<{ storageKey: string; checksum: string; expiresAt: Date }>,
  ): Promise<void>;
}
