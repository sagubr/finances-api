import type {
  AnnualReport,
  CashflowForecast,
  CashflowRange,
  CategorySpending,
  CompareReportQuery,
  ComparisonReport,
  ExportInput,
  ExportView,
  MonthlyCalendar,
} from "#/modules/reports/dtos/report.dto.js";

export interface IReportRepository {
  annual(year: number, calculatedAt: string): Promise<AnnualReport>;
  compare(input: CompareReportQuery, calculatedAt: string): Promise<ComparisonReport>;
  cashflow(input: CashflowRange, calculatedAt: string): Promise<CashflowForecast>;
  categorySpending(month: string, calculatedAt: string): Promise<CategorySpending>;
  monthlyCalendar(month: string, calculatedAt: string): Promise<MonthlyCalendar>;
  createExport(publicId: string, jobId: string, input: ExportInput): Promise<void>;
  findExport(publicId: string): Promise<ExportView | null>;
  createDownloadToken(exportId: string, tokenHash: string, expiresAt: Date): Promise<boolean>;
  findDownloadArtifact(
    exportId: string,
    tokenHash: string,
    now: Date,
  ): Promise<Readonly<{ storageKey: string; checksum: string; format: "CSV" | "JSON" }> | null>;
  consumeDownloadToken(
    exportId: string,
    tokenHash: string,
    consumedAt: Date,
  ): Promise<Readonly<{ storageKey: string; checksum: string; format: "CSV" | "JSON" }> | null>;
}
