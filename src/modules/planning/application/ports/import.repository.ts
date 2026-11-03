import type { CommitImportInput, ParsedImportRow } from "#/modules/planning/dtos/import.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export type ImportFileMetadata = Readonly<{
  batchId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  checksum: string;
  fileSize: number;
}>;
export type ImportPreview = Readonly<{
  id: string;
  status: "PREVIEWED";
  rowCount: number;
  valid: number;
  invalid: number;
}>;
export type ImportBatchView = Readonly<{
  id: string;
  status: "UPLOADED" | "PROCESSING" | "PREVIEWED" | "COMMITTED" | "ROLLED_BACK" | "FAILED";
  fileName: string;
  rowCount: number;
  createdAt: string;
  committedAt: string | null;
  rolledBackAt: string | null;
}>;
export type ImportRowView = Readonly<{
  id: string;
  rowNumber: number;
  status: "VALID" | "WARNING" | "ERROR" | "COMMITTED" | "SKIPPED";
  normalized: Readonly<Record<string, unknown>> | null;
  errors: readonly string[];
}>;
export type ImportCommitView = Readonly<{
  id: string;
  commitId?: string;
  status: "COMMITTED";
  committedCount?: number;
  repeated: boolean;
}>;

export interface IImportRepository {
  createPreview(
    metadata: ImportFileMetadata,
    rows: readonly ParsedImportRow[],
  ): Promise<ImportPreview>;
  findBatch(publicId: string): Promise<ImportBatchView>;
  listRows(batchPublicId: string, query: CursorPaginationQuery): Promise<CursorPage<ImportRowView>>;
  updateRow(
    batchPublicId: string,
    rowPublicId: string,
    row: ParsedImportRow,
  ): Promise<ImportRowView>;
  commit(
    batchPublicId: string,
    input: CommitImportInput,
    commitId: string,
    generateId: () => string,
  ): Promise<ImportCommitView>;
  rollback(batchPublicId: string): Promise<number>;
}
