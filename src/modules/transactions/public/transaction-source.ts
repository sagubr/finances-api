export const transactionSource = {
  cardPurchase: "CC_PURCHASE",
  cardInstallment: "CC_INSTALLMENT",
  cardPayment: "CC_PAYMENT",
  cardRecurring: "CC_RECURRING",
  cardProjection: "CC_PROJECTION",
  recurring: "RC",
  import: "IMP",
  transfer: "TX",
} as const;

export const legacyCardSources = {
  purchaseOrInstallmentOrPayment: "CC",
  recurring: "CCRC",
  projection: "CCP",
} as const;

export const cardInstallmentSources = [
  transactionSource.cardInstallment,
  legacyCardSources.purchaseOrInstallmentOrPayment,
] as const;

export const cardRecurringSources = [
  transactionSource.cardRecurring,
  legacyCardSources.recurring,
] as const;

export const cardProjectionSources = [
  transactionSource.cardProjection,
  legacyCardSources.projection,
] as const;

export const categorizedConsumptionTypes = ["EXPENSE", "CARD_PAYMENT"] as const;

export const isManualCardPurchaseSource = (
  sourceModule: string | null,
  sourcePublicId: string | null,
  statementPublicId: string,
): boolean =>
  sourceModule === transactionSource.cardPurchase ||
  (sourceModule === legacyCardSources.purchaseOrInstallmentOrPayment &&
    sourcePublicId === statementPublicId);
