import { transactionLocationSchema } from "#/modules/transactions/dtos/transaction.dto.js";
import {
  cursorPaginationQuerySchema,
  pageInfoSchema,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import {
  civilDateSchema,
  competenceMonthSchema,
  ianaTimezoneSchema,
  publicIdSchema,
} from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const uuidSchema = publicIdSchema;
export const dateSchema = civilDateSchema;
export const monthSchema = competenceMonthSchema;
export const positiveMoneySchema = z.number().int().positive().safe();

const currencySchema = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase());

export const recurringInputSchema = z
  .object({
    accountId: uuidSchema,
    creditCardId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    type: z.enum(["INCOME", "EXPENSE"]),
    description: z.string().trim().min(1).max(500),
    amountCents: positiveMoneySchema,
    currency: currencySchema,
    frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
    interval: z.number().int().positive().max(365).default(1),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startsOn: dateSchema,
    endsOn: dateSchema.optional(),
    timezone: ianaTimezoneSchema,
  })
  .refine((value) => !value.endsOn || value.startsOn <= value.endsOn, {
    message: "endsOn must be after or equal to startsOn.",
    path: ["endsOn"],
  })
  .refine((value) => !value.creditCardId || value.type === "EXPENSE", {
    message: "Credit card recurrences must be expenses.",
    path: ["type"],
  })
  .refine((value) => !value.creditCardId || Boolean(value.categoryId), {
    message: "Credit card recurrences require an expense category.",
    path: ["categoryId"],
  });

export const installmentsInputSchema = z.object({
  accountId: uuidSchema,
  creditCardId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  description: z.string().trim().min(1).max(500),
  totalAmountCents: positiveMoneySchema,
  installments: z.number().int().min(1).max(600),
  firstDueOn: dateSchema,
  currency: currencySchema,
});
export const installmentPatchSchema = installmentsInputSchema
  .omit({ installments: true })
  .extend({ expectedVersion: z.number().int().positive() });

export const installmentQuerySchema = cursorPaginationQuerySchema;

export const cardInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]).optional(),
  lastFour: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  currency: currencySchema,
  limitCents: positiveMoneySchema,
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  accountingMode: z.enum(["DETAILED", "PAYMENT_ONLY"]).default("DETAILED"),
  paymentAccountId: uuidSchema.optional(),
});
export const cardPatchSchema = cardInputSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export const budgetInputSchema = z.object({
  month: monthSchema,
  categoryId: uuidSchema,
  limitCents: z.number().int().nonnegative().safe(),
  currency: currencySchema,
});

export const versionInputSchema = z.object({ expectedVersion: z.number().int().positive() });

export const recurringPatchSchema = z.object({
  expectedVersion: z.number().int().positive(),
  description: z.string().trim().min(1).max(500).optional(),
  amountCents: positiveMoneySchema.optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  interval: z.number().int().positive().max(365).optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  endsOn: dateSchema.nullable().optional(),
  timezone: ianaTimezoneSchema.optional(),
});

export const deleteRecurringInputSchema = versionInputSchema.extend({
  deletePlannedOccurrences: z.boolean().default(true),
});

export const cardPurchaseInputSchema = z.object({
  categoryId: uuidSchema,
  amountCents: positiveMoneySchema,
  description: z.string().trim().min(1).max(500),
  occurredOn: dateSchema,
  location: transactionLocationSchema.optional(),
});
export const cardPurchasePatchSchema = cardPurchaseInputSchema.extend({
  location: transactionLocationSchema.nullable().optional(),
  expectedVersion: z.number().int().positive(),
});

export const statementPaymentInputSchema = versionInputSchema.extend({
  accountId: uuidSchema,
  amountCents: positiveMoneySchema,
  paidOn: dateSchema,
});

export const budgetPatchSchema = versionInputSchema.extend({
  limitCents: z.number().int().nonnegative().safe(),
});

export const copyBudgetsInputSchema = z.object({
  sourceMonth: monthSchema,
  targetMonth: monthSchema,
});

export const resourceIdParamsSchema = z.object({ id: uuidSchema });
export const cardPurchaseParamsSchema = z.object({
  id: uuidSchema,
  purchaseId: uuidSchema,
});
export const recurringRuleSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  creditCardId: uuidSchema.nullable(),
  creditCardName: z.string().nullable(),
  categoryId: uuidSchema.nullable(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().positive(),
  dayOfMonth: z.number().int().nullable(),
  dayOfWeek: z.number().int().nullable(),
  startsOn: dateSchema,
  endsOn: dateSchema.nullable(),
  nextOccurrenceOn: dateSchema,
  timezone: z.string(),
  pausedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
});
export const recurringRuleResponseSchema = z.object({
  success: z.literal(true),
  data: recurringRuleSchema,
});
export const recurringRuleListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(recurringRuleSchema), pageInfo: pageInfoSchema }),
});
export const recurringToggleResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ id: uuidSchema, version: z.number().int().positive(), paused: z.boolean() }),
});
export const recurringDeleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: uuidSchema,
    deleted: z.literal(true),
    version: z.number().int().positive(),
  }),
});

export type ResourceIdParams = z.infer<typeof resourceIdParamsSchema>;
export type RecurringInput = z.infer<typeof recurringInputSchema>;
export type RecurringPatch = z.infer<typeof recurringPatchSchema>;
export type VersionInput = z.infer<typeof versionInputSchema>;
export type DeleteRecurringInput = z.infer<typeof deleteRecurringInputSchema>;
export type RecurringRuleView = z.infer<typeof recurringRuleSchema>;
export const installmentPlanSchema = z.object({
  id: uuidSchema,
  totalAmountCents: z.number().int().positive(),
  installments: z.array(
    z.object({
      number: z.number().int().positive(),
      amountCents: z.number().int().positive(),
      dueOn: dateSchema,
      transactionId: uuidSchema,
    }),
  ),
});
export const installmentPlanResponseSchema = z.object({
  success: z.literal(true),
  data: installmentPlanSchema,
});
export type InstallmentsInput = z.infer<typeof installmentsInputSchema>;
export type InstallmentPatch = z.infer<typeof installmentPatchSchema>;
export type InstallmentPlanView = z.infer<typeof installmentPlanSchema>;
export type InstallmentQuery = CursorPaginationQuery;
export const installmentPlanSummarySchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  creditCardId: uuidSchema.nullable(),
  creditCardName: z.string().nullable(),
  categoryId: uuidSchema.nullable(),
  description: z.string(),
  totalAmountCents: z.number().int().positive(),
  installments: z.number().int().positive(),
  firstDueOn: dateSchema,
  currency: z.string().length(3),
  version: z.number().int().positive(),
});
export const installmentPlanListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(installmentPlanSummarySchema), pageInfo: pageInfoSchema }),
});
export type InstallmentPlanSummary = z.infer<typeof installmentPlanSummarySchema>;
export const creditCardSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  brand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]).nullable(),
  lastFour: z.string().nullable(),
  paymentAccountId: uuidSchema.nullable(),
  currency: z.string().length(3),
  limitCents: z.number().int().positive(),
  closingDay: z.number().int(),
  dueDay: z.number().int(),
  accountingMode: z.enum(["DETAILED", "PAYMENT_ONLY"]),
  active: z.boolean(),
  version: z.number().int().positive(),
});
export const statementSummarySchema = z.object({
  id: uuidSchema,
  cycleStartOn: dateSchema,
  cycleEndOn: dateSchema,
  dueOn: dateSchema,
  status: z.enum(["OPEN", "CLOSED", "PARTIALLY_PAID", "PAID"]),
  totalCents: z.number().int().nonnegative(),
  paidCents: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export const statementPurchaseSchema = z.object({
  id: uuidSchema,
  categoryId: uuidSchema,
  description: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  occurredOn: dateSchema,
  location: transactionLocationSchema.nullable().default(null),
  editable: z.boolean(),
  version: z.number().int().positive(),
});
export const statementSchema = statementSummarySchema.extend({
  cardId: uuidSchema,
  accountingMode: z.enum(["DETAILED", "PAYMENT_ONLY"]),
  purchases: z.object({ items: z.array(statementPurchaseSchema), pageInfo: pageInfoSchema }),
});
export const cardPurchaseSchema = z.object({
  id: uuidSchema,
  cardId: uuidSchema,
  statementId: uuidSchema,
  categoryId: uuidSchema,
  amountCents: z.number().int().positive(),
  description: z.string(),
  occurredOn: dateSchema,
  competenceMonth: monthSchema,
  currency: z.string().length(3),
  status: z.literal("CONFIRMED"),
  location: transactionLocationSchema.nullable().default(null),
  version: z.number().int().positive(),
});
export const statementCloseSchema = z.object({
  id: uuidSchema,
  status: z.literal("CLOSED"),
  totalCents: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export const statementReopenSchema = z.object({
  id: uuidSchema,
  status: z.literal("OPEN"),
  totalCents: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export const statementPaymentSchema = z.object({
  id: uuidSchema,
  statementId: uuidSchema,
  transactionId: uuidSchema,
  amountCents: z.number().int().positive(),
  paidCents: z.number().int().positive(),
  status: z.enum(["PARTIALLY_PAID", "PAID"]),
  version: z.number().int().positive(),
});
const success = <T extends z.ZodType>(data: T) => z.object({ success: z.literal(true), data });
export const creditCardResponseSchema = success(creditCardSchema);
export const creditCardListResponseSchema = success(
  z.object({ items: z.array(creditCardSchema), pageInfo: pageInfoSchema }),
);
export const cardPurchaseResponseSchema = success(cardPurchaseSchema);
export const statementListResponseSchema = success(
  z.object({ items: z.array(statementSummarySchema), pageInfo: pageInfoSchema }),
);
export const statementResponseSchema = success(statementSchema);
export const statementCloseResponseSchema = success(statementCloseSchema);
export const statementReopenResponseSchema = success(statementReopenSchema);
export const statementPaymentResponseSchema = success(statementPaymentSchema);
export type CardInput = z.infer<typeof cardInputSchema>;
export type CardPatch = z.infer<typeof cardPatchSchema>;
export type CardPurchaseInput = z.infer<typeof cardPurchaseInputSchema>;
export type CardPurchasePatch = z.infer<typeof cardPurchasePatchSchema>;
export type CardPurchaseParams = z.infer<typeof cardPurchaseParamsSchema>;
export type StatementPaymentInput = z.infer<typeof statementPaymentInputSchema>;
export type CreditCardView = z.infer<typeof creditCardSchema>;
export type CardPurchaseView = z.infer<typeof cardPurchaseSchema>;
export type StatementSummary = z.infer<typeof statementSummarySchema>;
export type StatementView = z.infer<typeof statementSchema>;
export type StatementPaymentView = z.infer<typeof statementPaymentSchema>;
export const budgetSchema = z.object({
  id: uuidSchema,
  month: monthSchema,
  categoryId: uuidSchema,
  categoryName: z.string(),
  limitCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  version: z.number().int().positive(),
});
export const budgetProgressItemSchema = z.object({
  id: uuidSchema,
  limitCents: z.number().int().nonnegative(),
  realizedCents: z.number().int().nonnegative(),
  plannedCents: z.number().int().nonnegative(),
  consumptionBps: z.number().int().nullable(),
  currency: z.string().length(3),
});
export const budgetCopySchema = z.object({
  sourceMonth: monthSchema,
  targetMonth: monthSchema,
  copied: z.number().int().nonnegative(),
});
export const planningListQuerySchema = cursorPaginationQuerySchema;
export const budgetQuerySchema = cursorPaginationQuerySchema.extend({
  month: monthSchema.optional(),
});
export const budgetProgressQuerySchema = cursorPaginationQuerySchema.extend({ month: monthSchema });
export const budgetResponseSchema = success(budgetSchema);
export const budgetListResponseSchema = success(
  z.object({ items: z.array(budgetSchema), pageInfo: pageInfoSchema }),
);
export const budgetCopyResponseSchema = success(budgetCopySchema);
export const budgetProgressResponseSchema = success(
  z.object({
    month: monthSchema,
    items: z.array(budgetProgressItemSchema),
    pageInfo: pageInfoSchema,
  }),
);
export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type BudgetPatch = z.infer<typeof budgetPatchSchema>;
export type CopyBudgetsInput = z.infer<typeof copyBudgetsInputSchema>;
export type BudgetView = z.infer<typeof budgetSchema>;
export type BudgetProgressItem = z.infer<typeof budgetProgressItemSchema>;
export type PlanningListQuery = CursorPaginationQuery;
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
export type BudgetProgressQuery = z.infer<typeof budgetProgressQuerySchema>;
