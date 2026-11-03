import type { IImportFileParser } from "#/modules/planning/application/ports/import-file-parser.js";
import type { NormalizedImportRow, ParsedImportRow } from "#/modules/planning/dtos/import.dto.js";
import { civilDateSchema, publicIdSchema } from "#/shared/validation/http-primitives.js";
import { read, utils } from "@e965/xlsx";
import { parse as parseCsv } from "csv-parse/sync";

type RawRow = Record<string, string>;
const endOfCentralDirectorySignature = 0x06054b50;
const centralDirectoryEntrySignature = 0x02014b50;
const maxXlsxUncompressedBytes = 50 * 1024 * 1024;
const maxXlsxEntries = 10_000;

const assertSafeXlsxArchive = (buffer: Buffer): void => {
  const minimumEndRecordSize = 22;
  const searchStart = Math.max(0, buffer.length - 65_535 - minimumEndRecordSize);
  let endOffset = -1;
  for (let offset = buffer.length - minimumEndRecordSize; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) !== endOfCentralDirectorySignature) continue;
    endOffset = offset;
    break;
  }
  if (endOffset < 0) throw new Error("XLSX ZIP directory is missing.");
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endOffset + 16);
  if (entryCount > maxXlsxEntries || directoryOffset + directorySize > endOffset)
    throw new Error("XLSX ZIP directory exceeds safe limits.");

  let offset = directoryOffset;
  let totalUncompressedBytes = 0;
  for (let entry = 0; entry < entryCount; entry += 1) {
    if (offset + 46 > endOffset || buffer.readUInt32LE(offset) !== centralDirectoryEntrySignature)
      throw new Error("XLSX ZIP directory is invalid.");
    const uncompressedBytes = buffer.readUInt32LE(offset + 24);
    if (uncompressedBytes === 0xffffffff)
      throw new Error("ZIP64 XLSX files are not accepted for import.");
    totalUncompressedBytes += uncompressedBytes;
    if (totalUncompressedBytes > maxXlsxUncompressedBytes)
      throw new Error("XLSX expanded content exceeds the safe limit.");
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  if (offset > directoryOffset + directorySize) throw new Error("XLSX ZIP directory is invalid.");
};

const normalizeHeader = (value: string): string =>
  value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_");
const parseMoney = (value: string): number | undefined => {
  const normalized = value
    .trim()
    .replaceAll(/[^0-9,.-]/g, "")
    .replaceAll(".", "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const cents = Math.round(Math.abs(Number(normalized)) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : undefined;
};
const parseDate = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (civilDateSchema.safeParse(trimmed).success) return trimmed;
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!brazilian) return undefined;
  const normalized = `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}`;
  return civilDateSchema.safeParse(normalized).success ? normalized : undefined;
};
const firstValue = (row: RawRow, aliases: readonly string[]): string | undefined =>
  aliases.map((key) => row[key]).find((value) => value !== undefined && value !== "");

const normalizeRow = (raw: RawRow): ParsedImportRow => {
  const descriptionCandidate = firstValue(raw, ["descricao", "description", "historico"]);
  const description =
    descriptionCandidate && descriptionCandidate.trim().length <= 500
      ? descriptionCandidate.trim()
      : undefined;
  const amountText = firstValue(raw, ["valor", "amount", "amount_cents"]);
  const dateText = firstValue(raw, ["data", "date", "occurred_on"]);
  const typeText = firstValue(raw, ["tipo", "type"])?.toUpperCase();
  const amountCents = amountText ? parseMoney(amountText) : undefined;
  const occurredOn = dateText ? parseDate(dateText) : undefined;
  const type =
    typeText === "RECEITA" || typeText === "INCOME"
      ? "INCOME"
      : typeText === "DESPESA" || typeText === "EXPENSE"
        ? "EXPENSE"
        : undefined;
  const accountIdCandidate = firstValue(raw, ["conta_id", "account_id"]);
  const categoryIdCandidate = firstValue(raw, ["categoria_id", "category_id"]);
  const accountId = publicIdSchema.safeParse(accountIdCandidate).success
    ? accountIdCandidate
    : undefined;
  const categoryId = publicIdSchema.safeParse(categoryIdCandidate).success
    ? categoryIdCandidate
    : undefined;
  const errors = [
    !descriptionCandidate ? "DESCRIPTION_REQUIRED" : !description ? "DESCRIPTION_INVALID" : null,
    !amountCents ? "AMOUNT_INVALID" : null,
    !occurredOn ? "DATE_INVALID" : null,
    !type ? "TYPE_INVALID" : null,
    !accountIdCandidate ? "ACCOUNT_REQUIRED" : !accountId ? "ACCOUNT_INVALID" : null,
    categoryIdCandidate && !categoryId ? "CATEGORY_INVALID" : null,
  ].filter((error): error is string => error !== null);
  const normalized: NormalizedImportRow = {
    ...(description ? { description } : {}),
    ...(amountCents ? { amountCents } : {}),
    ...(occurredOn ? { occurredOn, competenceMonth: occurredOn.slice(0, 7) } : {}),
    ...(type ? { type } : {}),
    ...(accountId ? { accountId } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
  return { raw, normalized, errors };
};

export class ImportFileParser implements IImportFileParser {
  parse(buffer: Buffer, fileName: string): readonly ParsedImportRow[] {
    return this.readRows(buffer, fileName).map(normalizeRow);
  }

  normalize(value: Readonly<Record<string, unknown>>): ParsedImportRow {
    const raw = Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        typeof child === "string" ? child : String(child),
      ]),
    );
    return normalizeRow(raw);
  }

  private readRows(buffer: Buffer, fileName: string): RawRow[] {
    if (!fileName.toLowerCase().endsWith(".xlsx") && buffer.subarray(0, 2).toString() !== "PK")
      return parseCsv<RawRow>(buffer, {
        bom: true,
        columns: (headers: string[]) => headers.map(normalizeHeader),
        delimiter: buffer.subarray(0, buffer.indexOf("\n")).includes(59) ? ";" : ",",
        max_record_size: 64 * 1024,
        skip_empty_lines: true,
        to_line: 20_002,
        relax_column_count: true,
        trim: true,
      });
    assertSafeXlsxArchive(buffer);
    const workbook = read(buffer, {
      type: "buffer",
      sheetRows: 20_002,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
    });
    const sheet = workbook.SheetNames[0] ? workbook.Sheets[workbook.SheetNames[0]] : undefined;
    if (!sheet) return [];
    return utils
      .sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false })
      .map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            normalizeHeader(key),
            typeof value === "string"
              ? value.trim()
              : typeof value === "number" || typeof value === "boolean"
                ? String(value)
                : "",
          ]),
        ),
      );
  }
}
