import type {
  IMarketDataProvider,
  ProviderQuote,
  ProviderQuoteBatch,
} from "#/modules/wealth/application/ports/market-data-provider.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { z } from "zod";

const quoteDataSchema = z.object({
  shortName: z.string().nullish(),
  longName: z.string().nullish(),
  currency: z.string().length(3),
  regularMarketPrice: z.number().finite().nonnegative(),
  regularMarketTime: z.string().datetime().nullish(),
  regularMarketChange: z.number().finite().nullish(),
  regularMarketChangePercent: z.number().finite().nullish(),
  logourl: z.string().url().nullish(),
});

const quoteItemSchema = z.object({
  requestedSymbol: z.string(),
  symbol: z.string(),
  changed: z.boolean(),
  data: quoteDataSchema,
});

const responseSchema = z.object({
  results: z.array(quoteItemSchema),
  requestedAt: z.string().datetime(),
});

const normalizeSymbol = (value: string) => value.trim().toUpperCase();
const decimal = (value: number | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toString();

export class BrapiMarketDataProvider implements IMarketDataProvider {
  constructor(
    private readonly options: Readonly<{
      apiKey?: string;
      baseUrl: string;
      timeoutMs: number;
    }>,
  ) {}

  async fetchQuotes(symbols: readonly string[]): Promise<ProviderQuoteBatch> {
    const requestedSymbols = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
    if (requestedSymbols.length === 0)
      throw new ApplicationError("Informe ao menos um ticker.", {
        category: "validation",
        code: "MARKET_SYMBOL_REQUIRED",
      });

    const requestedAt = new Date();
    const endpoint = "/stocks/quote";
    const url = new URL(`${this.options.baseUrl}${endpoint}`);
    url.searchParams.set("symbols", requestedSymbols.join(","));
    const headers = new Headers({ Accept: "application/json" });
    if (this.options.apiKey) headers.set("Authorization", `Bearer ${this.options.apiKey}`);

    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (cause: unknown) {
      throw new ApplicationError("A Brapi está temporariamente indisponível.", {
        category: "unavailable",
        code: "MARKET_PROVIDER_UNAVAILABLE",
        cause,
      });
    }

    const receivedAt = new Date();
    const rawPayload: unknown = await response.json().catch(() => null);
    if (!response.ok) this.throwProviderError(response.status, rawPayload);

    const parsed = responseSchema.safeParse(rawPayload);
    if (!parsed.success)
      throw new ApplicationError("A Brapi retornou uma resposta inválida.", {
        category: "unavailable",
        code: "MARKET_PROVIDER_INVALID_RESPONSE",
        details: parsed.error.issues.map(({ path, code }) => ({ path, code })),
      });

    const quotes = parsed.data.results.map((item): ProviderQuote => {
      const marketAt = item.data.regularMarketTime
        ? new Date(item.data.regularMarketTime)
        : new Date(parsed.data.requestedAt);
      return {
        requestedSymbol: normalizeSymbol(item.requestedSymbol),
        symbol: normalizeSymbol(item.symbol),
        name: item.data.longName ?? item.data.shortName ?? normalizeSymbol(item.symbol),
        currency: item.data.currency.toUpperCase(),
        price: item.data.regularMarketPrice.toString(),
        marketAt,
        dayChange: decimal(item.data.regularMarketChange),
        dayChangePercent: decimal(item.data.regularMarketChangePercent),
        logoUrl: item.data.logourl ?? null,
      };
    });

    return {
      provider: "BRAPI",
      endpoint,
      requestedSymbols,
      requestedAt,
      receivedAt,
      httpStatus: response.status,
      rawPayload,
      quotes,
    };
  }

  private throwProviderError(status: number, details: unknown): never {
    if (status === 429)
      throw new ApplicationError("O limite de consultas da Brapi foi atingido.", {
        category: "rate-limit",
        code: "MARKET_PROVIDER_RATE_LIMITED",
        details,
      });
    if (status === 404)
      throw new ApplicationError("Ticker não encontrado na Brapi.", {
        category: "not-found",
        code: "MARKET_SYMBOL_NOT_FOUND",
      });
    throw new ApplicationError("Não foi possível consultar a Brapi.", {
      category: "unavailable",
      code: "MARKET_PROVIDER_ERROR",
      details: { status },
    });
  }
}
