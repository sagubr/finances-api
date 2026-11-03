import { pageInfoSchema } from "#/shared/pagination/cursor-pagination.js";
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
export const wishlistPurchaseInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  accountId: operationUuidSchema,
  categoryId: operationUuidSchema,
  amountCents: z.number().int().positive().safe(),
  purchasedOn: operationDateSchema,
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
  version: z.number().int().positive(),
});
export const wishlistPurchaseSchema = z.object({
  itemId: operationUuidSchema,
  transactionId: operationUuidSchema,
  repeated: z.boolean(),
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
export const notificationListResponseSchema = success(
  z.object({ items: z.array(notificationSchema), pageInfo: pageInfoSchema }),
);
export const notificationReadAllResponseSchema = success(notificationReadAllSchema);
export const notificationReadResponseSchema = success(notificationReadSchema);

export type WishlistInput = z.infer<typeof wishlistInputSchema>;
export type WishlistPatch = z.infer<typeof wishlistPatchSchema>;
export type WishlistPurchaseInput = z.infer<typeof wishlistPurchaseInputSchema>;
export type WishlistItemView = z.infer<typeof wishlistItemSchema>;
export type WishlistPurchaseView = z.infer<typeof wishlistPurchaseSchema>;
export type NotificationView = z.infer<typeof notificationSchema>;
