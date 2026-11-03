import { assertNonOverlappingSlots } from "#/modules/operations/domain/planner.js";
import { reachedBudgetThresholds } from "#/modules/planning/domain/budget-thresholds.js";
import { resolveCardCycle } from "#/modules/planning/domain/card-cycle.js";
import { splitInstallments } from "#/modules/planning/domain/installments.js";
import { addCalendarMonths, nextRecurrenceDate } from "#/modules/planning/domain/recurrence.js";
import { calculateMonthlySummary } from "#/modules/transactions/domain/monthly-summary.js";
import { calculateLinearDepreciation } from "#/modules/wealth/domain/depreciation.js";
import { calculatePosition } from "#/modules/wealth/domain/position-calculator.js";
import { describe, expect, it } from "vitest";

describe("financial domain rules", () => {
  it("distributes installment remainder from the first installment", () => {
    expect(splitInstallments(10_000n, 3)).toEqual([3_334n, 3_333n, 3_333n]);
  });

  it("uses the last valid day when adding calendar months", () => {
    expect(addCalendarMonths("2028-01-31", 1, 31)).toBe("2028-02-29");
    expect(addCalendarMonths("2027-01-31", 1, 31)).toBe("2027-02-28");
  });

  it("advances weekly, monthly and yearly recurrence without drifting month end", () => {
    expect(nextRecurrenceDate("2026-01-01", "WEEKLY", 2)).toBe("2026-01-15");
    expect(nextRecurrenceDate("2026-01-31", "MONTHLY", 1, 31)).toBe("2026-02-28");
    expect(nextRecurrenceDate("2024-02-29", "YEARLY", 1, 29)).toBe("2025-02-28");
  });

  it("keeps transfers and card payments out of financial result", () => {
    const result = calculateMonthlySummary([
      { type: "INCOME", status: "SETTLED", amountCents: 10_000n, deleted: false },
      { type: "EXPENSE", status: "CONFIRMED", amountCents: 2_000n, deleted: false },
      { type: "TRANSFER", status: "SETTLED", amountCents: 5_000n, deleted: false },
      { type: "CARD_PAYMENT", status: "SETTLED", amountCents: 2_000n, deleted: false },
    ]);
    expect(result.netCents).toBe(8_000n);
  });

  it("rebuilds average cost and realized result from orders", () => {
    const result = calculatePosition([
      { side: "BUY", quantity: "10", unitPrice: "10", fees: "0" },
      { side: "BUY", quantity: "10", unitPrice: "20", fees: "0" },
      { side: "SELL", quantity: "5", unitPrice: "18", fees: "0" },
    ]);
    expect(result).toEqual({
      quantity: "15",
      totalCost: "225.0000000000",
      averageCost: "15.0000000000",
      realizedResult: "15.0000000000",
    });
  });

  it("never depreciates below residual value", () => {
    expect(
      calculateLinearDepreciation({
        costCents: 120_000n,
        residualCents: 20_000n,
        usefulLifeMonths: 10,
        acquiredOn: "2025-01-01",
        referenceOn: "2030-01-01",
      }),
    ).toBe(20_000n);
  });

  it("rejects overlapping planner slots", () => {
    expect(() =>
      assertNonOverlappingSlots([
        { weekday: 1, startMinute: 480, durationMinutes: 60 },
        { weekday: 1, startMinute: 510, durationMinutes: 30 },
      ]),
    ).toThrow("overlap");
  });

  it("places purchases on opposite sides of the card closing date", () => {
    expect(resolveCardCycle("2026-01-10", 10, 17)).toEqual({
      startsOn: "2025-12-11",
      endsOn: "2026-01-10",
      dueOn: "2026-01-17",
    });
    expect(resolveCardCycle("2026-01-11", 10, 17)).toEqual({
      startsOn: "2026-01-11",
      endsOn: "2026-02-10",
      dueOn: "2026-02-17",
    });
  });

  it("keeps zero budgets undefined and reports reached milestones", () => {
    expect(reachedBudgetThresholds(1n, 0n)).toEqual({ consumptionBps: null, thresholds: [] });
    expect(reachedBudgetThresholds(8_000n, 10_000n)).toEqual({
      consumptionBps: 8_000,
      thresholds: [8_000],
    });
    expect(reachedBudgetThresholds(11_000n, 10_000n)).toEqual({
      consumptionBps: 11_000,
      thresholds: [8_000, 10_000],
    });
  });
});
