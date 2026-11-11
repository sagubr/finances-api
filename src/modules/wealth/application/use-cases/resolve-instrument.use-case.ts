import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IMarketDataCatalog } from "#/modules/wealth/application/ports/market-data-catalog.js";
import type { IMarketDataProvider } from "#/modules/wealth/application/ports/market-data-provider.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export class ResolveInstrumentUseCase {
  constructor(
    private readonly provider: IMarketDataProvider,
    private readonly catalog: IMarketDataCatalog,
    private readonly options: Readonly<{
      cacheMs: number;
      minRequestIntervalMs: number;
      now: () => Date;
    }>,
  ) {}

  async execute(context: RequestContext, ticker: string) {
    requireWorkspaceMutation(context);
    const symbol = ticker.trim().toUpperCase();
    const now = this.options.now();
    const cached = await this.catalog.findInstrument(
      symbol,
      new Date(now.getTime() - this.options.cacheMs),
    );
    if (cached) return cached;

    const reserved = await this.catalog.tryReserveProviderRequest(
      "BRAPI",
      this.options.minRequestIntervalMs,
      now,
    );
    if (!reserved) {
      const stale = await this.catalog.findInstrument(symbol);
      if (stale) return stale;
      throw new ApplicationError("Aguarde um minuto antes de consultar um novo ticker.", {
        category: "rate-limit",
        code: "MARKET_PROVIDER_RATE_LIMITED",
      });
    }
    const batch = await this.provider.fetchQuotes([symbol]);
    const instruments = await this.catalog.saveQuoteBatch(batch);
    const instrument = instruments.find((item) => item.symbol === symbol) ?? instruments[0];
    if (!instrument)
      throw new ApplicationError("Ticker não encontrado na Brapi.", {
        category: "not-found",
        code: "MARKET_SYMBOL_NOT_FOUND",
      });
    return instrument;
  }
}
