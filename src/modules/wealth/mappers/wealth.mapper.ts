import type {
  AssetView,
  InvestmentAccountView,
  NetWorthView,
  PositionProjectionView,
} from "#/modules/wealth/dtos/wealth.dto.js";

export const mapSafeMoney = (value: bigint): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error("Persisted monetary value exceeds safe range.");
  return number;
};

export const mapInvestmentAccount = (row: {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  version: number;
}): InvestmentAccountView => row;

export const mapPositionProjection = (row: {
  investmentAccountId: string;
  instrumentId: string;
  symbol: string;
  name: string;
  quantity: string;
  averageCost: string;
  totalCost: string;
  sourceVersion: number;
  latestPrice: string | null;
  calculatedAt: Date;
  quoteAt: Date | null;
}): PositionProjectionView => ({
  investmentAccountId: row.investmentAccountId,
  instrumentId: row.instrumentId,
  symbol: row.symbol,
  name: row.name,
  quantity: row.quantity,
  averageCost: row.averageCost,
  totalCost: row.totalCost,
  sourceVersion: row.sourceVersion,
  latestPrice: row.latestPrice,
  calculatedAt: row.calculatedAt.toISOString(),
  quoteAt: row.quoteAt?.toISOString() ?? null,
});

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
