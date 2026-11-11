import {
  cursorPaginationQuerySchema,
  pageInfoSchema,
} from "#/shared/pagination/cursor-pagination.js";
import { competenceMonthSchema } from "#/shared/validation/http-primitives.js";
import { z } from "zod";
import { operationDateSchema, operationUuidSchema, success } from "./operations.shared.dto.js";

export const wishlistInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z
    .string()
    .url()
    .max(2048)
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"))
    .optional(),
  estimatedPriceCents: z.number().int().positive().safe().optional(),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  priority: z.number().int().min(0).max(10).default(0),
  reason: z.string().trim().max(500).optional(),
  plannedOn: operationDateSchema.optional(),
});
export const wishlistPatchSchema = wishlistInputSchema.extend({
  expectedVersion: z.number().int().positive(),
});
export const wishlistListQuerySchema = cursorPaginationQuerySchema.extend({
  status: z.enum(["PLANNED", "PURCHASE_PENDING", "PURCHASED", "ARCHIVED"]).optional(),
  month: competenceMonthSchema.optional(),
  from: operationDateSchema.optional(),
  to: operationDateSchema.optional(),
  priority: z.coerce.number().int().min(0).max(10).optional(),
});
export const wishlistSummaryQuerySchema = z.object({ month: competenceMonthSchema });
export const wishlistPurchaseInputSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    createTransaction: z.boolean().default(true),
    accountId: operationUuidSchema.optional(),
    categoryId: operationUuidSchema.optional(),
    amountCents: z.number().int().positive().safe(),
    purchasedOn: operationDateSchema,
  })
  .superRefine((value, context) => {
    if (!value.createTransaction) return;
    if (!value.accountId)
      context.addIssue({ code: "custom", path: ["accountId"], message: "Conta obrigatória." });
    if (!value.categoryId)
      context.addIssue({ code: "custom", path: ["categoryId"], message: "Categoria obrigatória." });
  });
export const wishlistItemSchema = z.object({
  id: operationUuidSchema,
  name: z.string(),
  url: z.string().nullable(),
  estimatedPriceCents: z.number().int().nullable(),
  currency: z.string().length(3),
  priority: z.number().int(),
  reason: z.string().nullable(),
  plannedOn: operationDateSchema.nullable(),
  status: z.enum(["PLANNED", "PURCHASE_PENDING", "PURCHASED", "ARCHIVED"]),
  actualPriceCents: z.number().int().nullable(),
  purchasedOn: operationDateSchema.nullable(),
  transactionId: operationUuidSchema.nullable(),
  version: z.number().int().positive(),
});
export const wishlistPurchaseSchema = z.object({
  itemId: operationUuidSchema,
  transactionId: operationUuidSchema.nullable(),
  repeated: z.boolean(),
});
export const wishlistSummarySchema = z.object({
  month: competenceMonthSchema,
  totals: z.array(
    z.object({
      currency: z.string().length(3),
      totalCents: z.number().int().nonnegative(),
      itemCount: z.number().int().nonnegative(),
    }),
  ),
});
export const notificationSchema = z.object({
  id: operationUuidSchema,
  type: z.string(),
  title: z.string(),
  body: z.string(),
  referenceType: z.string().nullable(),
  referenceId: operationUuidSchema.nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export const notificationReadAllSchema = z.object({ updated: z.number().int().nonnegative() });
export const notificationReadSchema = z.object({ id: operationUuidSchema, read: z.literal(true) });
export const wishlistResponseSchema = success(wishlistItemSchema);
export const wishlistListResponseSchema = success(
  z.object({ items: z.array(wishlistItemSchema), pageInfo: pageInfoSchema }),
);
export const wishlistPurchaseResponseSchema = success(wishlistPurchaseSchema);
export const wishlistSummaryResponseSchema = success(wishlistSummarySchema);
export const notificationListResponseSchema = success(
  z.object({ items: z.array(notificationSchema), pageInfo: pageInfoSchema }),
);
export const notificationReadAllResponseSchema = success(notificationReadAllSchema);
export const notificationReadResponseSchema = success(notificationReadSchema);

export type WishlistInput = z.infer<typeof wishlistInputSchema>;
export type WishlistPatch = z.infer<typeof wishlistPatchSchema>;
export type WishlistListQuery = z.infer<typeof wishlistListQuerySchema>;
export type WishlistSummaryQuery = z.infer<typeof wishlistSummaryQuerySchema>;
export type WishlistPurchaseInput = z.infer<typeof wishlistPurchaseInputSchema>;
export type WishlistItemView = z.infer<typeof wishlistItemSchema>;
export type WishlistPurchaseView = z.infer<typeof wishlistPurchaseSchema>;
export type WishlistSummaryView = z.infer<typeof wishlistSummarySchema>;
export type NotificationView = z.infer<typeof notificationSchema>;
