import {
  monthlyCalendarQuerySchema,
  monthlyCalendarResponseSchema,
} from "#/modules/reports/dtos/report.dto.js";
import { listTransactionsQuerySchema } from "#/modules/transactions/dtos/transaction.dto.js";
import { describe, expect, it } from "vitest";

describe("monthly calendar contracts", () => {
  it("accepts a competence and daily aggregate", () => {
    expect(monthlyCalendarQuerySchema.parse({ month: "2026-11" })).toEqual({
      month: "2026-11",
    });
    expect(
      monthlyCalendarResponseSchema.parse({
        success: true,
        data: {
          month: "2026-11",
          items: [
            {
              date: "2026-11-09",
              realizedExpenseCents: 12_500,
              plannedExpenseCents: 4_000,
              realizedCount: 2,
              plannedCount: 1,
            },
          ],
          totals: {
            realizedExpenseCents: 12_500,
            plannedExpenseCents: 4_000,
            realizedCount: 2,
            plannedCount: 1,
          },
          calculatedAt: "2026-11-09T12:00:00.000Z",
          dataVersion: 1,
        },
      }).success,
    ).toBe(true);
  });

  it("validates the optional exact day transaction filter", () => {
    expect(listTransactionsQuerySchema.parse({ month: "2026-11", date: "2026-11-09" }).date).toBe(
      "2026-11-09",
    );
    expect(
      listTransactionsQuerySchema.safeParse({ month: "2026-11", date: "2026-11-31" }).success,
    ).toBe(false);
  });
});
