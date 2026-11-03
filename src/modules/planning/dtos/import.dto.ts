import {
  cursorPaginationQuerySchema,
  pageInfoSchema,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import {
  civilDateSchema,
  competenceMonthSchema,
  publicIdSchema,
} from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const importTemplateResponseSchema = z.string();

export const committableImportRowSchema = z.object({
  description: z.string().trim().min(1).max(500),
  amountCents: z.number().int().positive().safe(),
  occurredOn: civilDateSchema,
  competenceMonth: competenceMonthSchema,
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: publicIdSchema,
  categoryId: publicIdSchema.optional(),
});
export const normalizedImportRowSchema = committableImportRowSchema.partial().strict();
export const importRowCorrectionSchema = z
  .record(
    z.string().min(1).max(64),
    z.union([z.string().max(2_048), z.number().finite(), z.boolean(), z.null()]),
  )
  .refine((value) => Object.keys(value).length <= 50, "Too many import columns.");
export const commitImportInputSchema = z.object({
  rowIds: z.array(publicIdSchema).max(20_000).optional(),
});

export const importIdParamsSchema = z.object({ id: publicIdSchema });
export const importRowParamsSchema = importIdParamsSchema.extend({ rowId: publicIdSchema });
export const importStatusSchema = z.enum([
  "UPLOADED",
  "PROCESSING",
  "PREVIEWED",
  "COMMITTED",
  "ROLLED_BACK",
  "FAILED",
]);
export const importRowStatusSchema = z.enum(["VALID", "WARNING", "ERROR", "COMMITTED", "SKIPPED"]);
export const importBatchSchema = z.object({
  id: publicIdSchema,
  status: importStatusSchema,
  fileName: z.string(),
  rowCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  committedAt: z.string().datetime().nullable(),
  rolledBackAt: z.string().datetime().nullable(),
});
export const importPreviewSchema = z.object({
  id: publicIdSchema,
  status: z.literal("PREVIEWED"),
  rowCount: z.number().int().positive(),
  valid: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
});
export const importRowSchema = z.object({
  id: publicIdSchema,
  rowNumber: z.number().int().positive(),
  status: importRowStatusSchema,
  normalized: normalizedImportRowSchema.nullable(),
  errors: z.array(z.string()),
});
export const importCommitSchema = z.object({
  id: publicIdSchema,
  commitId: publicIdSchema.optional(),
  status: z.literal("COMMITTED"),
  committedCount: z.number().int().nonnegative().optional(),
  repeated: z.boolean(),
});
export const importRollbackSchema = z.object({
  id: publicIdSchema,
  status: z.literal("ROLLED_BACK"),
  rolledBackCount: z.number().int().nonnegative(),
});
const success = <T extends z.ZodType>(data: T) => z.object({ success: z.literal(true), data });
export const importBatchResponseSchema = success(importBatchSchema);
export const importPreviewResponseSchema = success(importPreviewSchema);
export const importRowsQuerySchema = cursorPaginationQuerySchema;
export const importRowsResponseSchema = success(
  z.object({ items: z.array(importRowSchema), pageInfo: pageInfoSchema }),
);
export const importRowResponseSchema = success(importRowSchema.omit({ rowNumber: true }));
export const importCommitResponseSchema = success(importCommitSchema);
export const importRollbackResponseSchema = success(importRollbackSchema);

export type ImportIdParams = z.infer<typeof importIdParamsSchema>;
export type ImportRowParams = z.infer<typeof importRowParamsSchema>;
export type CommitImportInput = z.infer<typeof commitImportInputSchema>;
export type ImportRowCorrection = z.infer<typeof importRowCorrectionSchema>;
export type ImportRowsQuery = CursorPaginationQuery;
export type NormalizedImportRow = Readonly<{
  description?: string;
  amountCents?: number;
  occurredOn?: string;
  type?: "INCOME" | "EXPENSE";
  accountId?: string;
  categoryId?: string;
  competenceMonth?: string;
}>;
export type ParsedImportRow = Readonly<{
  raw: Readonly<Record<string, string>>;
  normalized: NormalizedImportRow;
  errors: readonly string[];
}>;
