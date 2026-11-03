import {
  cursorPaginationQuerySchema,
  decodeCompositeCursor,
  pageInfoSchema,
} from "#/shared/pagination/cursor-pagination.js";
import { z } from "zod";
import { operationUuidSchema, success } from "./operations.shared.dto.js";

export const consentInputSchema = z.object({
  documentId: operationUuidSchema,
  purpose: z.string().min(1).max(160),
});
export const planSchema = z.object({
  id: operationUuidSchema,
  code: z.string(),
  name: z.string(),
  versionId: operationUuidSchema,
  version: z.number().int(),
  currency: z.string().length(3),
  priceCents: z.number().int().nonnegative(),
  entitlements: z.unknown(),
});
export const subscriptionSchema = z.object({
  id: operationUuidSchema,
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]),
  currentPeriodEnd: z.string().datetime().nullable(),
  code: z.string(),
  name: z.string(),
  entitlements: z.unknown(),
});
export const legalDocumentSchema = z.object({
  id: operationUuidSchema,
  kind: z.string(),
  version: z.string(),
  title: z.string(),
  contentUri: z.string(),
  effectiveAt: z.string().datetime(),
});
export const consentSchema = z.object({
  id: operationUuidSchema,
  documentId: operationUuidSchema,
  purpose: z.string(),
  consentedAt: z.string().datetime(),
});
export const privacyExportSchema = z.object({
  id: operationUuidSchema,
  requestId: operationUuidSchema,
  status: z.literal("REQUESTED"),
});
export const privacyDeletionSchema = privacyExportSchema.extend({
  executeAfter: z.string().datetime(),
});
export const billingUsageSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      period: z.string(),
      value: z.number().int().nonnegative(),
      updatedAt: z.string().datetime(),
    }),
  ),
  pageInfo: pageInfoSchema,
});
export const privacyExportDetailSchema = z.object({
  id: operationUuidSchema,
  requestId: operationUuidSchema,
  status: z.enum(["REQUESTED", "PROCESSING", "READY", "COMPLETED", "CANCELLED", "FAILED"]),
  encrypted: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  downloadedAt: z.string().datetime().nullable(),
});
export const privacyDownloadTokenSchema = z.object({
  token: z.string().min(32).max(256),
  expiresAt: z.string().datetime(),
});
export const privacyDownloadInputSchema = z.object({ token: z.string().min(32).max(256) });
export const privacyDownloadResponseSchema = z.string();
export const deletionCancelSchema = z.object({
  id: operationUuidSchema,
  status: z.literal("CANCELLED"),
  cancelledAt: z.string().datetime(),
});
export const sensitiveAccessSchema = z.object({
  id: operationUuidSchema,
  actorType: z.string(),
  actorId: operationUuidSchema.nullable(),
  action: z.string(),
  purpose: z.string(),
  resourceType: z.string(),
  requestId: z.string(),
  occurredAt: z.string().datetime(),
});
export const billingProviderPayloadSchema = z.record(z.string(), z.unknown());
export const billingUsageQuerySchema = cursorPaginationQuerySchema.refine(
  ({ cursor }) => !cursor || Boolean(decodeCompositeCursor(cursor, 2)),
  { message: "Invalid billing usage cursor.", path: ["cursor"] },
);
export const planListResponseSchema = success(z.object({ items: z.array(planSchema) }));
export const subscriptionResponseSchema = success(subscriptionSchema.nullable());
export const legalDocumentListResponseSchema = success(
  z.object({ items: z.array(legalDocumentSchema) }),
);
export const consentResponseSchema = success(consentSchema);
export const privacyExportResponseSchema = success(privacyExportSchema);
export const privacyDeletionResponseSchema = success(privacyDeletionSchema);
export const billingUsageResponseSchema = success(billingUsageSchema);
export const privacyExportDetailResponseSchema = success(privacyExportDetailSchema);
export const privacyDownloadTokenResponseSchema = success(privacyDownloadTokenSchema);
export const deletionCancelResponseSchema = success(deletionCancelSchema);
export const sensitiveAccessListResponseSchema = success(
  z.object({ items: z.array(sensitiveAccessSchema), pageInfo: pageInfoSchema }),
);

export type ConsentInput = z.infer<typeof consentInputSchema>;
export type PrivacyDownloadInput = z.infer<typeof privacyDownloadInputSchema>;
export type PlanView = z.infer<typeof planSchema>;
export type SubscriptionView = z.infer<typeof subscriptionSchema>;
export type LegalDocumentView = z.infer<typeof legalDocumentSchema>;
export type ConsentView = z.infer<typeof consentSchema>;
