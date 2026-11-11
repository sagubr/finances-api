import type {
  AssetView,
  NetWorthView,
  PositionProjectionView,
} from "#/modules/wealth/dtos/wealth.dto.js";
import { Decimal } from "decimal.js";

type TimestampValue = Date | string;

const toDate = (value: TimestampValue): Date => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Persisted timestamp is invalid.");
  return date;
};

const toIsoString = (value: TimestampValue): string => toDate(value).toISOString();

export const mapSafeMoney = (value: bigint): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error("Persisted monetary value exceeds safe range.");
  return number;
};

export const mapPositionProjection = (row: {
  accountId: string;
  instrumentId: string;
  orderId: string | null;
  orderVersion: number | null;
  orderQuantity: string | null;
  orderUnitPrice: string | null;
  orderFees: string | null;
  orderTradedOn: string | null;
  symbol: string;
  name: string;
  quantity: string;
  averageCost: string;
  totalCost: string;
  currency: string;
  logoUrl: string | null;
  sourceVersion: number;
  latestPrice: string | null;
  dayChange: string | null;
  dayChangePercent: string | null;
  quoteProvider: string | null;
  calculatedAt: TimestampValue;
  quoteAt: TimestampValue | null;
  quoteIngestedAt: TimestampValue | null;
}): PositionProjectionView => {
  const currentValue = row.latestPrice
    ? new Decimal(row.quantity).times(row.latestPrice).toFixed(10)
    : null;
  const unrealizedResult = currentValue
    ? new Decimal(currentValue).minus(row.totalCost).toFixed(10)
    : null;
  const unrealizedPercent =
    unrealizedResult && !new Decimal(row.totalCost).isZero()
      ? new Decimal(unrealizedResult).dividedBy(row.totalCost).times(100).toFixed(4)
      : null;
  return {
    accountId: row.accountId,
    instrumentId: row.instrumentId,
    orderId: row.orderId,
    orderVersion: row.orderVersion,
    orderQuantity: row.orderQuantity,
    orderUnitPrice: row.orderUnitPrice,
    orderFees: row.orderFees,
    orderTradedOn: row.orderTradedOn,
    symbol: row.symbol,
    name: row.name,
    quantity: row.quantity,
    averageCost: row.averageCost,
    totalCost: row.totalCost,
    currency: row.currency,
    logoUrl: row.logoUrl,
    sourceVersion: row.sourceVersion,
    latestPrice: row.latestPrice,
    currentValue,
    unrealizedResult,
    unrealizedPercent,
    dayChange: row.dayChange,
    dayChangePercent: row.dayChangePercent,
    quoteProvider: row.quoteProvider,
    calculatedAt: toIsoString(row.calculatedAt),
    quoteAt: row.quoteAt ? toIsoString(row.quoteAt) : null,
    quoteIngestedAt: row.quoteIngestedAt ? toIsoString(row.quoteIngestedAt) : null,
    quoteStale:
      !row.quoteIngestedAt ||
      Date.now() - toDate(row.quoteIngestedAt).getTime() > 2 * 60 * 60 * 1_000,
  };
};

export const mapAsset = (row: {
  id: string;
  categoryId: string | null;
  name: string;
  status: AssetView["status"];
  acquiredOn: string | null;
  acquisitionCostCents: bigint;
  currency: string;
  valuationMethod: AssetView["valuationMethod"];
  usefulLifeMonths: number | null;
  residualValueCents: bigint;
  version: number;
}): AssetView => ({
  ...row,
  categoryId: row.categoryId ?? null,
  acquisitionCostCents: mapSafeMoney(row.acquisitionCostCents),
  residualValueCents: mapSafeMoney(row.residualValueCents),
});

type NetWorthComponent = NetWorthView["components"][number];

export const mapAccountComponent = (account: {
  id: string;
  name: string;
  currency: string;
  opening: bigint;
  movement: bigint;
}): NetWorthComponent => ({
  type: "ACCOUNT",
  id: account.id,
  name: account.name,
  valueCents: mapSafeMoney(account.opening + account.movement),
  currency: account.currency,
});

export const mapInvestmentComponent = (investment: {
  id: string;
  accountName: string;
  symbol: string;
  currency: string;
  valueCents: bigint;
}): NetWorthComponent => ({
  type: "INVESTMENT",
  id: investment.id,
  name: `${investment.accountName} · ${investment.symbol}`,
  valueCents: mapSafeMoney(investment.valueCents),
  currency: investment.currency,
});

export const mapAssetComponent = (
  asset: {
    publicId: string;
    name: string;
    currency: string;
  },
  value: bigint,
): NetWorthComponent => ({
  type: "ASSET",
  id: asset.publicId,
  name: asset.name,
  valueCents: mapSafeMoney(value),
  currency: asset.currency,
});
