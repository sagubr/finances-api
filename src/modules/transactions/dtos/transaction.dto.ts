import {
  cursorPaginationQuerySchema,
  cursorSchema,
  decodeCursor,
  pageInfoSchema,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import {
  publicIdSchema,
  civilDateSchema as sharedCivilDateSchema,
  competenceMonthSchema as sharedCompetenceMonthSchema,
} from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const uuidSchema = publicIdSchema;
export const civilDateSchema = sharedCivilDateSchema;
export const competenceMonthSchema = sharedCompetenceMonthSchema;
export const positiveMoneySchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const transactionStatusSchema = z.enum(["PLANNED", "CONFIRMED", "SETTLED"]);
export const transactionTypeSchema = z.enum([
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "CARD_PAYMENT",
  "INVESTMENT",
]);
export const transactionLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().positive().nullable(),
    capturedAt: z.string().datetime({ offset: true }),
    source: z.enum(["DEVICE", "MAP_PIN"]),
  })
  .superRefine((location, context) => {
    if (location.source === "MAP_PIN" && location.accuracyMeters !== null)
      context.addIssue({
        code: "custom",
        path: ["accuracyMeters"],
        message: "Map pin locations cannot declare device accuracy.",
      });
  });

const currencySchema = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase());

export const accountInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "BROKERAGE", "BENEFIT", "OTHER"]),
  currency: currencySchema,
  openingBalanceCents: z.number().int().safe().default(0),
  openingBalanceOn: civilDateSchema,
});
export const accountPatchSchema = accountInputSchema
  .partial()
  .extend({ expectedVersion: z.number().int().positive() });
export const resourceIdParamsSchema = z.object({ id: uuidSchema });
export const accountSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "BROKERAGE", "BENEFIT", "OTHER"]),
  currency: z.string().length(3),
  openingBalanceCents: z.number().int(),
  openingBalanceOn: civilDateSchema,
  currentBalanceCents: z.number().int(),
  projectedBalanceCents: z.number().int(),
  active: z.boolean(),
  version: z.number().int().positive(),
});
export const accountResponseSchema = z.object({ success: z.literal(true), data: accountSchema });
export const accountListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(accountSchema), pageInfo: pageInfoSchema }),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export const categoryPatchSchema = categoryInputSchema.extend({
  expectedVersion: z.number().int().positive(),
});
export const categorySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  isDefault: z.boolean(),
  active: z.boolean(),
  version: z.number().int().positive(),
});
export const categoryResponseSchema = z.object({ success: z.literal(true), data: categorySchema });
export const categoryListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(categorySchema), pageInfo: pageInfoSchema }),
});
export const resourceListQuerySchema = cursorPaginationQuerySchema;

export const transactionInputSchema = z
  .object({
    accountId: uuidSchema,
    categoryId: uuidSchema.optional(),
    type: z.enum(["INCOME", "EXPENSE"]),
    status: transactionStatusSchema,
    amountCents: positiveMoneySchema,
    currency: currencySchema,
    description: z.string().trim().min(1).max(500),
    occurredOn: civilDateSchema,
    location: transactionLocationSchema.optional(),
  })
  .superRefine((transaction, context) => {
    if (transaction.location && transaction.type !== "EXPENSE")
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Location is only supported for expense transactions.",
      });
  });

export const transactionPatchSchema = z.object({
  expectedVersion: z.number().int().positive(),
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.nullable().optional(),
  amountCents: positiveMoneySchema.optional(),
  description: z.string().trim().min(1).max(500).optional(),
  occurredOn: civilDateSchema.optional(),
  location: transactionLocationSchema.nullable().optional(),
});

export const versionInputSchema = z.object({ expectedVersion: z.number().int().positive() });

export const transferInputSchema = z
  .object({
    fromAccountId: uuidSchema,
    toAccountId: uuidSchema,
    amountCents: positiveMoneySchema,
    currency: currencySchema,
    description: z.string().trim().min(1).max(500),
    occurredOn: civilDateSchema,
    status: transactionStatusSchema.default("SETTLED"),
  })
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: "Accounts must be different.",
  });

const transactionCursorSchema = cursorSchema.refine((cursor) => {
  const [date, id] = decodeCursor(cursor)?.split("|") ?? [];
  return Boolean(date && civilDateSchema.safeParse(date).success && id && /^\d+$/.test(id));
}, "Invalid transaction cursor.");
export const listTransactionsQuerySchema = z.object({
  month: competenceMonthSchema,
  date: civilDateSchema.optional(),
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: transactionCursorSchema.optional(),
});

export const transactionMapQuerySchema = z.object({
  month: competenceMonthSchema,
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
});

export const transactionSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  categoryId: uuidSchema.nullable(),
  type: transactionTypeSchema,
  status: transactionStatusSchema,
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  description: z.string(),
  occurredOn: civilDateSchema,
  competenceMonth: competenceMonthSchema,
  settledOn: civilDateSchema.nullable(),
  sourceModule: z.string().max(40).nullable(),
  // Correlation IDs predate the UUIDv7 public-ID policy and may contain legacy UUIDs.
  sourcePublicId: z.string().uuid().nullable(),
  location: transactionLocationSchema.nullable().default(null),
  version: z.number().int().positive(),
  deletedAt: z.string().datetime().nullable(),
});
export const transactionResponseSchema = z.object({
  success: z.literal(true),
  data: transactionSchema,
});
export const transactionListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(transactionSchema),
    pageInfo: z.object({ nextCursor: z.string().nullable(), hasNextPage: z.boolean() }),
  }),
});
const transactionMapFeaturePropertiesSchema = z.object({
  transactionId: uuidSchema,
  accountId: uuidSchema,
  accountName: z.string(),
  categoryId: uuidSchema.nullable(),
  categoryName: z.string().nullable(),
  categoryColor: z.string().nullable(),
  description: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  occurredOn: civilDateSchema,
  status: transactionStatusSchema,
  sourceModule: z.string().nullable(),
});
export const transactionMapSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      id: uuidSchema,
      geometry: z.object({
        type: z.literal("Point"),
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      properties: transactionMapFeaturePropertiesSchema,
    }),
  ),
  summary: z.object({
    transactionCount: z.number().int().nonnegative(),
    locatedCount: z.number().int().nonnegative(),
    unlocatedCount: z.number().int().nonnegative(),
    locatedAmountCents: z.number().int().nonnegative(),
  }),
});
export const transactionMapResponseSchema = z.object({
  success: z.literal(true),
  data: transactionMapSchema,
});
export const transferSchema = z.object({
  id: uuidSchema,
  debitTransactionId: uuidSchema,
  creditTransactionId: uuidSchema,
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  version: z.number().int().positive(),
});
export const transferResponseSchema = z.object({ success: z.literal(true), data: transferSchema });
export const monthlySummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    month: competenceMonthSchema,
    incomeCents: z.number().int(),
    expenseCents: z.number().int(),
    plannedIncomeCents: z.number().int(),
    plannedExpenseCents: z.number().int(),
    plannedCardPaymentCents: z.number().int(),
    netCents: z.number().int(),
    plannedNetCents: z.number().int(),
  }),
});
export const monthlySummaryQuerySchema = z.object({ month: competenceMonthSchema });

export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountPatch = z.infer<typeof accountPatchSchema>;
export type ResourceIdParams = z.infer<typeof resourceIdParamsSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryPatch = z.infer<typeof categoryPatchSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionPatch = z.infer<typeof transactionPatchSchema>;
export type VersionInput = z.infer<typeof versionInputSchema>;
export type TransferInput = z.infer<typeof transferInputSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type TransactionMapQuery = z.infer<typeof transactionMapQuerySchema>;
export type TransactionMapView = z.infer<typeof transactionMapSchema>;
export type ResourceListQuery = CursorPaginationQuery;
export type TransactionView = z.infer<typeof transactionSchema>;
export type TransferView = z.infer<typeof transferSchema>;
