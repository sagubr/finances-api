import type { ProviderQuoteBatch } from "#/modules/wealth/application/ports/market-data-provider.js";
import type { InstrumentView } from "#/modules/wealth/dtos/wealth.dto.js";

export interface IMarketDataCatalog {
  saveQuoteBatch(batch: ProviderQuoteBatch): Promise<readonly InstrumentView[]>;
  listSymbolsInUse(quotedSince?: Date): Promise<readonly string[]>;
  findInstrument(symbol: string, quotedSince?: Date): Promise<InstrumentView | null>;
  tryReserveProviderRequest(provider: string, intervalMs: number, now: Date): Promise<boolean>;
}
