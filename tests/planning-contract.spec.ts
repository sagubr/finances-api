import { recurringInputSchema } from "#/modules/planning/dtos/planning.dto.js";
import { describe, expect, it } from "vitest";

const baseRecurrence = {
  accountId: "019a4c64-9a81-7000-8000-000000000001",
  description: "Assinatura",
  amountCents: 2_000,
  currency: "BRL",
  type: "EXPENSE" as const,
  frequency: "MONTHLY" as const,
  interval: 1,
  startsOn: "2026-11-02",
  timezone: "America/Sao_Paulo",
};

describe("planning HTTP contracts", () => {
  it("requires an expense category for credit-card recurrences", () => {
    const creditCardId = "019a4c64-9a81-7000-8000-000000000002";

    expect(recurringInputSchema.safeParse({ ...baseRecurrence, creditCardId }).success).toBe(false);
    expect(
      recurringInputSchema.safeParse({
        ...baseRecurrence,
        creditCardId,
        categoryId: "019a4c64-9a81-7000-8000-000000000003",
      }).success,
    ).toBe(true);
  });
});
