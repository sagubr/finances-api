import { transferInputSchema } from "#/modules/transactions/dtos/transaction.dto.js";
import {
  cardInstallmentSources,
  cardProjectionSources,
  cardRecurringSources,
  categorizedConsumptionTypes,
  isManualCardPurchaseSource,
  transactionSource,
} from "#/modules/transactions/public/transaction-source.js";
import { describe, expect, it } from "vitest";

describe("transaction source semantics", () => {
  it("uses distinct sources for new card operations", () => {
    expect(
      new Set([
        transactionSource.cardPurchase,
        transactionSource.cardInstallment,
        transactionSource.cardPayment,
        transactionSource.cardRecurring,
        transactionSource.cardProjection,
      ]).size,
    ).toBe(5);
  });

  it("keeps legacy card sources readable", () => {
    expect(cardInstallmentSources).toContain("CC");
    expect(cardRecurringSources).toContain("CCRC");
    expect(cardProjectionSources).toContain("CCP");
    expect(isManualCardPurchaseSource("CC", "statement-id", "statement-id")).toBe(true);
    expect(isManualCardPurchaseSource("CC", "plan-id", "statement-id")).toBe(false);
    expect(
      isManualCardPurchaseSource(transactionSource.cardPurchase, "purchase-id", "statement-id"),
    ).toBe(true);
  });

  it("defines categorized consumption without projections or statement payments", () => {
    expect(categorizedConsumptionTypes).toEqual(["EXPENSE", "CARD_PAYMENT"]);
    expect(categorizedConsumptionTypes).not.toContain(transactionSource.cardProjection);
    expect(categorizedConsumptionTypes).not.toContain(transactionSource.cardPayment);
  });

  it("accepts planned transfers used by the investment cashflow forecast", () => {
    const transfer = {
      fromAccountId: "019a4c64-9a81-7000-8000-000000000001",
      toAccountId: "019a4c64-9a81-7000-8000-000000000002",
      amountCents: 10_000,
      currency: "BRL",
      description: "Aporte",
      occurredOn: "2026-11-02",
    };

    expect(transferInputSchema.safeParse(transfer).success).toBe(true);
    expect(transferInputSchema.safeParse({ ...transfer, status: "PLANNED" }).success).toBe(true);
  });
});
