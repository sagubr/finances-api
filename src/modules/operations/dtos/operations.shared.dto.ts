import {
  cursorPaginationQuerySchema,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import { civilDateSchema, publicIdSchema } from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const operationUuidSchema = publicIdSchema;
export const operationVersionInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
});
export const operationDateSchema = civilDateSchema;
export const operationDecimalSchema = z.string().regex(/^-?\d{1,20}(\.\d{1,10})?$/);
export const operationIdParamsSchema = z.object({ id: operationUuidSchema });
export const operationsListQuerySchema = cursorPaginationQuerySchema;
export const success = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), data });

export type OperationIdParams = z.infer<typeof operationIdParamsSchema>;
export type OperationsListQuery = CursorPaginationQuery;
