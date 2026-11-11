import { env, type Environment } from "#/config/env.config.js";

export type MarketDataConfig = Readonly<{
  brapiApiKey?: string;
  brapiBaseUrl: string;
  brapiTimeoutMs: number;
  brapiMinRequestIntervalMs: number;
  marketQuoteCacheMinutes: number;
  marketQuoteRefreshMinutes: number;
}>;

export const createMarketDataConfig = (value: Environment): MarketDataConfig => ({
  ...(value.BRAPI_API_KEY ? { brapiApiKey: value.BRAPI_API_KEY } : {}),
  brapiBaseUrl: value.BRAPI_BASE_URL,
  brapiTimeoutMs: value.BRAPI_TIMEOUT_MS,
  brapiMinRequestIntervalMs: value.BRAPI_MIN_REQUEST_INTERVAL_MS,
  marketQuoteCacheMinutes: value.MARKET_QUOTE_CACHE_MINUTES,
  marketQuoteRefreshMinutes: value.MARKET_QUOTE_REFRESH_MINUTES,
});

export const marketDataConfig = createMarketDataConfig(env);
