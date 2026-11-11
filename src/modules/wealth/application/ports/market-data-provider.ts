export type ProviderQuote = Readonly<{
  requestedSymbol: string;
  symbol: string;
  name: string;
  currency: string;
  price: string;
  marketAt: Date;
  dayChange: string | null;
  dayChangePercent: string | null;
  logoUrl: string | null;
}>;

export type ProviderQuoteBatch = Readonly<{
  provider: string;
  endpoint: string;
  requestedSymbols: readonly string[];
  requestedAt: Date;
  receivedAt: Date;
  httpStatus: number;
  rawPayload: unknown;
  quotes: readonly ProviderQuote[];
}>;

export interface IMarketDataProvider {
  fetchQuotes(symbols: readonly string[]): Promise<ProviderQuoteBatch>;
}
