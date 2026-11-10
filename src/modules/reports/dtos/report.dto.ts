import {
  civilDateSchema,
  competenceMonthSchema,
  publicIdSchema,
} from "#/shared/validation/http-primitives.js";
import { z } from "zod";

const uuidSchema = publicIdSchema;
const dateSchema = civilDateSchema;
const monthSchema = competenceMonthSchema;
const moneySchema = z.number().int().safe();
const success = <T extends z.ZodType>(data: T) => z.object({ success: z.literal(true), data });

export const annualReportQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
});
export const compareReportQuerySchema = z.object({ current: monthSchema, previous: monthSchema });
export const categorySpendingQuerySchema = z.object({ month: monthSchema });
export const monthlyCalendarQuerySchema = z.object({ month: monthSchema });
export const cashflowRangeSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .refine(({ from, to }) => from <= to, { message: "from must be before or equal to to" })
  .refine(
    ({ from, to }) =>
      (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000 <= 366,
    { message: "Cashflow range cannot exceed 366 days.", path: ["to"] },
  );
export const exportInputSchema = z.object({
  report: z.enum(["TRANSACTIONS", "ANNUAL"]),
  format: z.enum(["CSV", "JSON"]),
  filters: z.object({}).strict().default({}),
});
export const exportIdParamsSchema = z.object({ id: uuidSchema });

const reportMetadataSchema = z.object({
  calculatedAt: z.string().datetime(),
  dataVersion: z.number().int().positive(),
});
const annualMonthSchema = z.object({
  month: monthSchema,
  incomeCents: moneySchema,
  expenseCents: moneySchema,
  netCents: moneySchema,
  plannedIncomeCents: moneySchema,
  plannedExpenseCents: moneySchema,
  plannedNetCents: moneySchema,
});
export const annualReportSchema = reportMetadataSchema.extend({
  year: z.number().int(),
  months: z.array(annualMonthSchema).length(12),
  totals: z.object({ incomeCents: moneySchema, expenseCents: moneySchema, netCents: moneySchema }),
});
const comparisonValueSchema = z.object({
  month: monthSchema,
  incomeCents: moneySchema,
  expenseCents: moneySchema,
});
const variationSchema = z.object({
  bps: z.number().int().nullable(),
  reason: z.literal("NO_COMPARISON_BASE").nullable(),
});
export const comparisonReportSchema = reportMetadataSchema.extend({
  current: comparisonValueSchema,
  previous: comparisonValueSchema,
  variation: z.object({ income: variationSchema, expense: variationSchema }),
});
export const cashflowForecastSchema = reportMetadataSchema.extend({
  from: dateSchema,
  to: dateSchema,
  items: z.array(
    z.object({
      date: dateSchema,
      plannedIncomeCents: moneySchema,
      plannedExpenseCents: moneySchema,
      plannedInvestmentCents: moneySchema,
      plannedNetCents: moneySchema,
    }),
  ),
  totals: z.object({
    plannedIncomeCents: moneySchema,
    plannedExpenseCents: moneySchema,
    plannedInvestmentCents: moneySchema,
    plannedNetCents: moneySchema,
  }),
});
export const categorySpendingSchema = reportMetadataSchema.extend({
  month: monthSchema,
  items: z.array(
    z.object({
      categoryId: uuidSchema,
      categoryName: z.string(),
      color: z.string().nullable(),
      realizedCents: moneySchema,
      plannedCents: moneySchema,
      totalCents: moneySchema,
    }),
  ),
  totals: z.object({
    realizedCents: moneySchema,
    plannedCents: moneySchema,
    totalCents: moneySchema,
  }),
});
export const monthlyCalendarSchema = reportMetadataSchema.extend({
  month: monthSchema,
  items: z.array(
    z.object({
      date: dateSchema,
      realizedExpenseCents: moneySchema,
      plannedExpenseCents: moneySchema,
      realizedCount: z.number().int().nonnegative(),
      plannedCount: z.number().int().nonnegative(),
    }),
  ),
  totals: z.object({
    realizedExpenseCents: moneySchema,
    plannedExpenseCents: moneySchema,
    realizedCount: z.number().int().nonnegative(),
    plannedCount: z.number().int().nonnegative(),
  }),
});
export const exportAcceptedSchema = z.object({ id: uuidSchema, status: z.literal("PENDING") });
export const exportSchema = z.object({
  id: uuidSchema,
  report: z.enum(["TRANSACTIONS", "ANNUAL"]),
  format: z.enum(["CSV", "JSON"]),
  status: z.enum(["PENDING", "RUNNING", "READY", "FAILED", "EXPIRED", "CANCELLED"]),
  progress: z.number().int().min(0).max(100),
  expiresAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  errorCode: z.string().nullable(),
});
export const downloadTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});
export const downloadExportInputSchema = z.object({ token: z.string().min(32).max(256) });
export const downloadExportResponseSchema = z.string();

export const annualReportResponseSchema = success(annualReportSchema);
export const comparisonReportResponseSchema = success(comparisonReportSchema);
export const cashflowForecastResponseSchema = success(cashflowForecastSchema);
export const categorySpendingResponseSchema = success(categorySpendingSchema);
export const monthlyCalendarResponseSchema = success(monthlyCalendarSchema);
export const exportAcceptedResponseSchema = success(exportAcceptedSchema);
export const exportResponseSchema = success(exportSchema);
export const downloadTokenResponseSchema = success(downloadTokenSchema);

export type AnnualReportQuery = z.infer<typeof annualReportQuerySchema>;
export type CompareReportQuery = z.infer<typeof compareReportQuerySchema>;
export type CashflowRange = z.infer<typeof cashflowRangeSchema>;
export type CategorySpendingQuery = z.infer<typeof categorySpendingQuerySchema>;
export type MonthlyCalendarQuery = z.infer<typeof monthlyCalendarQuerySchema>;
export type ExportInput = z.infer<typeof exportInputSchema>;
export type ExportIdParams = z.infer<typeof exportIdParamsSchema>;
export type DownloadExportInput = z.infer<typeof downloadExportInputSchema>;
export type AnnualReport = z.infer<typeof annualReportSchema>;
export type ComparisonReport = z.infer<typeof comparisonReportSchema>;
export type CashflowForecast = z.infer<typeof cashflowForecastSchema>;
export type CategorySpending = z.infer<typeof categorySpendingSchema>;
export type MonthlyCalendar = z.infer<typeof monthlyCalendarSchema>;
export type ExportView = z.infer<typeof exportSchema>;
