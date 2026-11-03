import type { ParsedImportRow } from "#/modules/planning/dtos/import.dto.js";

export interface IImportFileParser {
  parse(buffer: Buffer, fileName: string): readonly ParsedImportRow[];
  normalize(value: Readonly<Record<string, unknown>>): ParsedImportRow;
}
