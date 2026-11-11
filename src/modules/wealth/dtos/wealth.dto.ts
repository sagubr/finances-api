import {
  cursorPaginationQuerySchema,
  decodeCursor,
  pageInfoSchema,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import { civilDateSchema, publicIdSchema } from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const wealthUuidSchema = publicIdSchema;
export const wealthDateSchema = civilDateSchema;
export const wealthDecimalSchema = z.string().regex(/^\d{1,18}(\.\d{1,12})?$/);
const currencySchema = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase());
const success = <T extends z.ZodType>(data: T) => z.object({ success: z.literal(true), data });

export const instrumentQuerySchema = cursorPaginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
});
export const wealthListQuerySchema = cursorPaginationQuerySchema;
export const positionListQuerySchema = cursorPaginationQuerySchema.refine(
  ({ cursor }) => !cursor || /^\d+$/.test(decodeCursor(cursor) ?? ""),
  { message: "Invalid position cursor.", path: ["cursor"] },
);
export const wealthIdParamsSchema = z.object({ id: wealthUuidSchema });
export const resolveInstrumentInputSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(4)
    .max(20)
    .regex(/^[A-Za-z0-9.]+$/)
    .transform((value) => value.toUpperCase()),
});
export const wealthDateQuerySchema = z.object({ date: wealthDateSchema.optional() });
export const orderInputSchema = z.object({
  accountId: wealthUuidSchema,
  instrumentId: wealthUuidSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: wealthDecimalSchema,
  unitPrice: wealthDecimalSchema,
  fees: wealthDecimalSchema.default("0"),
  currency: currencySchema,
  tradedOn: wealthDateSchema,
});
export const orderPatchSchema = z.object({
  expectedVersion: z.number().int().positive(),
  quantity: wealthDecimalSchema.optional(),
  unitPrice: wealthDecimalSchema.optional(),
  fees: wealthDecimalSchema.optional(),
  tradedOn: wealthDateSchema.optional(),
});
export const versionInputSchema = z.object({ expectedVersion: z.number().int().positive() });
const assetFieldsSchema = z.object({
  categoryId: wealthUuidSchema.optional(),
  name: z.string().trim().min(1).max(160),
  status: z.enum(["PLANNED", "ACTIVE"]).default("ACTIVE"),
  acquiredOn: wealthDateSchema.optional(),
  acquisitionCostCents: z.number().int().nonnegative().safe(),
  currency: currencySchema,
  valuationMethod: z.enum(["COST", "LINEAR_DEPRECIATION", "MARKET"]),
  usefulLifeMonths: z.number().int().positive().optional(),
  residualValueCents: z.number().int().nonnegative().safe().default(0),
});
export const assetInputSchema = assetFieldsSchema.refine(
  (value) => value.residualValueCents <= value.acquisitionCostCents,
  {
    message: "Residual value exceeds cost.",
  },
);
export const assetPatchSchema = assetFieldsSchema
  .omit({ status: true })
  .extend({
    status: z.enum(["PLANNED", "ACTIVE", "SOLD"]),
    expectedVersion: z.number().int().positive(),
  })
  .refine((value) => value.residualValueCents <= value.acquisitionCostCents, {
    message: "Residual value exceeds cost.",
  });
export const assetValuationInputSchema = z.object({
  valuedOn: wealthDateSchema,
  valueCents: z.number().int().nonnegative().safe(),
  currency: currencySchema,
  source: z.string().trim().min(1).max(200),
});

export const instrumentSchema = z.object({
  id: wealthUuidSchema,
  symbol: z.string(),
  market: z.string(),
  name: z.string(),
  currency: z.string().length(3),
  type: z.enum(["STOCK", "ETF", "FUND", "BOND", "CRYPTO", "CURRENCY", "OTHER"]),
  logoUrl: z.string().url().nullable(),
});
export const quoteSchema = z.object({
  id: wealthUuidSchema,
  price: z.string(),
  currency: z.string().length(3),
  provider: z.string(),
  marketAt: z.string().datetime(),
  ingestedAt: z.string().datetime(),
  stale: z.boolean(),
});
export const positionSchema = z.object({
  quantity: z.string(),
  totalCost: z.string(),
  averageCost: z.string(),
  realizedResult: z.string(),
});
export const orderSchema = z.object({
  id: wealthUuidSchema,
  accountId: wealthUuidSchema,
  instrumentId: wealthUuidSchema,
  symbol: z.string().optional(),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.string(),
  unitPrice: z.string(),
  fees: z.string(),
  currency: z.string().length(3),
  tradedOn: wealthDateSchema,
  version: z.number().int().positive(),
  position: positionSchema.optional(),
});
export const orderMutationSchema = z.object({
  id: wealthUuidSchema,
  version: z.number().int().positive(),
  position: positionSchema,
});
export const positionProjectionSchema = z.object({
  accountId: wealthUuidSchema,
  instrumentId: wealthUuidSchema,
  orderId: wealthUuidSchema.nullable(),
  orderVersion: z.number().int().positive().nullable(),
  orderQuantity: z.string().nullable(),
  orderUnitPrice: z.string().nullable(),
  orderFees: z.string().nullable(),
  orderTradedOn: wealthDateSchema.nullable(),
  symbol: z.string(),
  name: z.string(),
  quantity: z.string(),
  averageCost: z.string(),
  totalCost: z.string(),
  currency: z.string().length(3),
  logoUrl: z.string().url().nullable(),
  sourceVersion: z.number().int().nonnegative(),
  calculatedAt: z.string().datetime(),
  latestPrice: z.string().nullable(),
  currentValue: z.string().nullable(),
  unrealizedResult: z.string().nullable(),
  unrealizedPercent: z.string().nullable(),
  dayChange: z.string().nullable(),
  dayChangePercent: z.string().nullable(),
  quoteProvider: z.string().nullable(),
  quoteAt: z.string().datetime().nullable(),
  quoteIngestedAt: z.string().datetime().nullable(),
  quoteStale: z.boolean(),
});
export const portfolioSummarySchema = z.object({
  currency: z.string().length(3),
  invested: z.string(),
  current: z.string(),
  result: z.string(),
  positionCount: z.number().int().nonnegative(),
  quotedPositions: z.number().int().nonnegative(),
});
export const assetSchema = z.object({
  id: wealthUuidSchema,
  categoryId: wealthUuidSchema.nullable(),
  name: z.string(),
  status: z.enum(["PLANNED", "ACTIVE", "SOLD", "ARCHIVED"]),
  acquiredOn: wealthDateSchema.nullable(),
  acquisitionCostCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  valuationMethod: z.enum(["COST", "LINEAR_DEPRECIATION", "MARKET"]),
  usefulLifeMonths: z.number().int().positive().nullable(),
  residualValueCents: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export const assetValuationSchema = z.object({
  id: wealthUuidSchema,
  assetId: wealthUuidSchema,
  valuedOn: wealthDateSchema,
  valueCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  source: z.string(),
});
export const netWorthSchema = z.object({
  referenceOn: wealthDateSchema,
  totals: z.array(
    z.object({ currency: z.string().length(3), amountCents: z.number().int().safe() }),
  ),
  components: z
    .array(
      z.object({
        type: z.enum(["ACCOUNT", "INVESTMENT", "ASSET"]),
        id: wealthUuidSchema,
        name: z.string(),
        valueCents: z.number().int().safe(),
        currency: z.string().length(3),
      }),
    )
    .max(200),
  componentsTruncated: z.boolean(),
  calculatedAt: z.string().datetime(),
});
export const payrollCalculationInputSchema = z.record(z.string(), z.unknown());

export const instrumentListResponseSchema = success(
  z.object({ items: z.array(instrumentSchema), pageInfo: pageInfoSchema }),
);
export const quoteResponseSchema = success(quoteSchema);
export const orderResponseSchema = success(orderSchema);
export const orderMutationResponseSchema = success(orderMutationSchema);
export const orderListResponseSchema = success(
  z.object({ items: z.array(orderSchema), pageInfo: pageInfoSchema }),
);
export const positionListResponseSchema = success(
  z.object({
    items: z.array(positionProjectionSchema),
    pageInfo: pageInfoSchema,
    summaries: z.array(portfolioSummarySchema),
  }),
);
export const assetResponseSchema = success(assetSchema);
export const assetListResponseSchema = success(
  z.object({ items: z.array(assetSchema), pageInfo: pageInfoSchema }),
);
export const assetValuationResponseSchema = success(assetValuationSchema);
export const netWorthResponseSchema = success(netWorthSchema);

export type WealthIdParams = z.infer<typeof wealthIdParamsSchema>;
export type ResolveInstrumentInput = z.infer<typeof resolveInstrumentInputSchema>;
export type InstrumentQuery = z.infer<typeof instrumentQuerySchema>;
export type WealthDateQuery = z.infer<typeof wealthDateQuerySchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderPatch = z.infer<typeof orderPatchSchema>;
export type VersionInput = z.infer<typeof versionInputSchema>;
export type AssetInput = z.infer<typeof assetInputSchema>;
export type AssetPatch = z.infer<typeof assetPatchSchema>;
export type AssetValuationInput = z.infer<typeof assetValuationInputSchema>;
export type InstrumentView = z.infer<typeof instrumentSchema>;
export type QuoteView = z.infer<typeof quoteSchema>;
export type OrderView = z.infer<typeof orderSchema>;
export type OrderMutationView = z.infer<typeof orderMutationSchema>;
export type PositionProjectionView = z.infer<typeof positionProjectionSchema>;
export type AssetView = z.infer<typeof assetSchema>;
export type AssetValuationView = z.infer<typeof assetValuationSchema>;
export type NetWorthView = z.infer<typeof netWorthSchema>;
export type WealthListQuery = CursorPaginationQuery;
