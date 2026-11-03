import { pageInfoSchema } from "#/shared/pagination/cursor-pagination.js";
import { z } from "zod";
import {
  operationDateSchema,
  operationDecimalSchema,
  operationUuidSchema,
  success,
} from "./operations.shared.dto.js";

export const plannerWeekQuerySchema = z.object({ date: operationDateSchema.optional() });
export const activityInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export const activityPatchSchema = activityInputSchema.extend({
  expectedVersion: z.number().int().positive(),
});
export const slotsInputSchema = z.object({
  templateId: operationUuidSchema.optional(),
  name: z.string().trim().min(1).max(120).default("Semana padrão"),
  expectedVersion: z.number().int().positive().optional(),
  slots: z
    .array(
      z.object({
        activityId: operationUuidSchema,
        weekday: z.number().int().min(0).max(6),
        startMinute: z.number().int().min(0).max(1439),
        durationMinutes: z.number().int().positive().max(1440),
      }),
    )
    .max(336),
});
export const goalInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    type: z.enum([
      "MANUAL",
      "COUNT",
      "AMOUNT_INVESTED",
      "NET_WORTH",
      "CATEGORY_LIMIT",
      "HABIT_HOURS",
    ]),
    targetValue: operationDecimalSchema.refine((value) => Number(value) > 0),
    unit: z.string().trim().min(1).max(30),
    startsOn: operationDateSchema,
    dueOn: operationDateSchema.optional(),
    source: z
      .object({
        module: z.string().min(1).max(40),
        type: z.string().min(1).max(60),
        id: operationUuidSchema.optional(),
        config: z.record(z.string(), z.unknown()).default({}),
      })
      .optional(),
  })
  .refine((value) => !value.dueOn || value.startsOn <= value.dueOn, {
    message: "dueOn must be after or equal to startsOn.",
    path: ["dueOn"],
  });
export const goalPatchSchema = goalInputSchema.and(
  z.object({ expectedVersion: z.number().int().positive() }),
);
export const goalCheckinInputSchema = z.object({
  value: operationDecimalSchema,
  checkedOn: operationDateSchema,
  note: z.string().trim().max(500).optional(),
});
export const activitySchema = z.object({
  id: operationUuidSchema,
  name: z.string(),
  color: z.string().nullable(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
});
export const plannerSlotSchema = z.object({
  activityId: operationUuidSchema,
  weekday: z.number().int(),
  startMinute: z.number().int(),
  durationMinutes: z.number().int(),
});
export const plannerTemplateSchema = z.object({
  id: operationUuidSchema,
  name: z.string(),
  slots: z.array(plannerSlotSchema),
});
export const plannerWeekSchema = z.object({
  referenceDate: operationDateSchema,
  timezone: z.string(),
  slots: z.array(
    plannerSlotSchema.extend({
      id: operationUuidSchema,
      templateId: operationUuidSchema,
      name: z.string(),
      color: z.string().nullable(),
    }),
  ),
});
export const goalSchema = z.object({
  id: operationUuidSchema,
  name: z.string(),
  type: z.enum([
    "MANUAL",
    "COUNT",
    "AMOUNT_INVESTED",
    "NET_WORTH",
    "CATEGORY_LIMIT",
    "HABIT_HOURS",
  ]),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"]),
  targetValue: z.string(),
  unit: z.string(),
  startsOn: operationDateSchema,
  dueOn: operationDateSchema.nullable(),
  version: z.number().int().positive(),
  completedAt: z.string().datetime().nullable(),
});
export const goalCheckinSchema = z.object({
  id: operationUuidSchema,
  goalId: operationUuidSchema,
  value: z.string(),
  checkedOn: operationDateSchema,
  note: z.string().nullable(),
});
export const goalProgressSchema = z.object({
  goalId: operationUuidSchema,
  currentValue: z.string(),
  targetValue: z.string(),
  progressBps: z.number().int(),
  rawProgressBps: z.number().int(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"]),
  calculatedAt: z.string().datetime(),
});
export const activityResponseSchema = success(activitySchema);
export const activityListResponseSchema = success(
  z.object({ items: z.array(activitySchema), pageInfo: pageInfoSchema }),
);
export const plannerTemplateResponseSchema = success(plannerTemplateSchema);
export const plannerWeekResponseSchema = success(plannerWeekSchema);
export const goalResponseSchema = success(goalSchema);
export const goalListResponseSchema = success(
  z.object({ items: z.array(goalSchema), pageInfo: pageInfoSchema }),
);
export const goalCheckinResponseSchema = success(goalCheckinSchema);
export const goalProgressResponseSchema = success(goalProgressSchema);

export type PlannerWeekQuery = z.infer<typeof plannerWeekQuerySchema>;
export type ActivityInput = z.infer<typeof activityInputSchema>;
export type ActivityPatch = z.infer<typeof activityPatchSchema>;
export type SlotsInput = z.infer<typeof slotsInputSchema>;
export type GoalInput = z.infer<typeof goalInputSchema>;
export type GoalPatch = z.infer<typeof goalPatchSchema>;
export type GoalCheckinInput = z.infer<typeof goalCheckinInputSchema>;
export type ActivityView = z.infer<typeof activitySchema>;
export type PlannerTemplateView = z.infer<typeof plannerTemplateSchema>;
export type PlannerWeekView = z.infer<typeof plannerWeekSchema>;
export type GoalView = z.infer<typeof goalSchema>;
export type GoalCheckinView = z.infer<typeof goalCheckinSchema>;
export type GoalProgressView = z.infer<typeof goalProgressSchema>;
