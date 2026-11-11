import type { IMarketDataCatalog } from "#/modules/wealth/application/ports/market-data-catalog.js";
import type { IMarketDataProvider } from "#/modules/wealth/application/ports/market-data-provider.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";

export class RefreshMarketQuotesUseCase implements IJobHandler {
  readonly name = "refresh-market-quotes";

  constructor(
    private readonly provider: IMarketDataProvider,
    private readonly catalog: IMarketDataCatalog,
    private readonly options: Readonly<{
      cacheMs: number;
      minRequestIntervalMs: number;
      now: () => Date;
    }>,
  ) {}

  async execute(): Promise<void> {
    const now = this.options.now();
    const symbols = await this.catalog.listSymbolsInUse(
      new Date(now.getTime() - this.options.cacheMs),
    );
    if (symbols.length === 0) return;
    const reserved = await this.catalog.tryReserveProviderRequest(
      "BRAPI",
      this.options.minRequestIntervalMs,
      now,
    );
    if (!reserved) return;
    const batch = await this.provider.fetchQuotes(symbols);
    await this.catalog.saveQuoteBatch(batch);
  }
}
