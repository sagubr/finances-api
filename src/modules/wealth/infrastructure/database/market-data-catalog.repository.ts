import type { Database } from "#/infrastructure/database/db.provider.js";
import type { IMarketDataCatalog } from "#/modules/wealth/application/ports/market-data-catalog.js";
import type { ProviderQuoteBatch } from "#/modules/wealth/application/ports/market-data-provider.js";
import type { InstrumentView } from "#/modules/wealth/dtos/wealth.dto.js";
import {
  instrumentProviderMappings,
  instruments,
  marketDataFetches,
  marketProviderRateLimits,
  positionProjections,
  quotes,
} from "#/modules/wealth/infrastructure/database/wealth.schema.js";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

export class MarketDataCatalogRepository implements IMarketDataCatalog {
  constructor(
    private readonly database: Database,
    private readonly generateId: () => string,
  ) {}

  async saveQuoteBatch(batch: ProviderQuoteBatch): Promise<readonly InstrumentView[]> {
    const responseHash = createHash("sha256")
      .update(JSON.stringify(batch.rawPayload))
      .digest("hex");
    return this.database.transaction(async (transaction) => {
      const fetchRow = (
        await transaction
          .insert(marketDataFetches)
          .values({
            publicId: this.generateId(),
            provider: batch.provider,
            endpoint: batch.endpoint,
            requestedSymbols: batch.requestedSymbols,
            responsePayload: batch.rawPayload,
            responseHash,
            httpStatus: batch.httpStatus,
            requestedAt: batch.requestedAt,
            receivedAt: batch.receivedAt,
          })
          .returning({ id: marketDataFetches.id })
      )[0];
      if (!fetchRow) throw new Error("Market data fetch was not persisted.");

      const saved: InstrumentView[] = [];
      for (const quote of batch.quotes) {
        const instrument = (
          await transaction
            .insert(instruments)
            .values({
              publicId: this.generateId(),
              symbol: quote.symbol,
              market: "B3",
              name: quote.name,
              currency: quote.currency,
              type: "STOCK",
              metadata: { source: batch.provider, logoUrl: quote.logoUrl },
            })
            .onConflictDoUpdate({
              target: [instruments.symbol, instruments.market, instruments.currency],
              set: {
                name: quote.name,
                active: true,
                metadata: { source: batch.provider, logoUrl: quote.logoUrl },
                updatedAt: batch.receivedAt,
              },
            })
            .returning({
              internalId: instruments.id,
              id: instruments.publicId,
              symbol: instruments.symbol,
              market: instruments.market,
              name: instruments.name,
              currency: instruments.currency,
              type: instruments.type,
            })
        )[0];
        if (!instrument) throw new Error("Instrument was not persisted.");

        await transaction
          .insert(instrumentProviderMappings)
          .values({
            instrumentId: instrument.internalId,
            provider: batch.provider,
            providerSymbol: quote.symbol,
            metadata: { requestedSymbol: quote.requestedSymbol },
          })
          .onConflictDoUpdate({
            target: [
              instrumentProviderMappings.provider,
              instrumentProviderMappings.providerSymbol,
            ],
            set: {
              instrumentId: instrument.internalId,
              metadata: { requestedSymbol: quote.requestedSymbol },
            },
          });

        await transaction
          .insert(quotes)
          .values({
            instrumentId: instrument.internalId,
            fetchId: fetchRow.id,
            price: quote.price,
            dayChange: quote.dayChange,
            dayChangePercent: quote.dayChangePercent,
            currency: quote.currency,
            provider: batch.provider,
            marketAt: quote.marketAt,
            ingestedAt: batch.receivedAt,
            quality: "PROVIDER",
          })
          .onConflictDoUpdate({
            target: [quotes.provider, quotes.instrumentId, quotes.marketAt],
            set: {
              fetchId: fetchRow.id,
              price: quote.price,
              dayChange: quote.dayChange,
              dayChangePercent: quote.dayChangePercent,
              ingestedAt: batch.receivedAt,
              quality: "PROVIDER",
            },
          });

        saved.push({
          id: instrument.id,
          symbol: instrument.symbol,
          market: instrument.market,
          name: instrument.name,
          currency: instrument.currency,
          type: instrument.type,
          logoUrl: quote.logoUrl,
        });
      }
      return saved;
    });
  }

  async listSymbolsInUse(quotedSince?: Date): Promise<readonly string[]> {
    const needsRefresh = quotedSince
      ? sql`not exists (
          select 1
          from ${quotes} recent_quote
          where recent_quote.instrument_id = ${positionProjections.instrumentId}
            and recent_quote.provider = 'BRAPI'
            and recent_quote.ingested_at >= ${quotedSince}
        )`
      : sql`true`;
    const rows = await this.database
      .selectDistinct({ symbol: instruments.symbol })
      .from(positionProjections)
      .innerJoin(instruments, sql`${instruments.id} = ${positionProjections.instrumentId}`)
      .where(
        sql`${positionProjections.quantity} <> 0
          and ${instruments.active} = true
          and ${needsRefresh}`,
      );
    return rows.map(({ symbol }) => symbol);
  }

  async findInstrument(symbol: string, quotedSince?: Date): Promise<InstrumentView | null> {
    const instrument = (
      await this.database
        .select({
          internalId: instruments.id,
          id: instruments.publicId,
          symbol: instruments.symbol,
          market: instruments.market,
          name: instruments.name,
          currency: instruments.currency,
          type: instruments.type,
          metadata: instruments.metadata,
        })
        .from(instruments)
        .where(
          and(
            eq(instruments.symbol, symbol.trim().toUpperCase()),
            eq(instruments.market, "B3"),
            eq(instruments.active, true),
          ),
        )
        .limit(1)
    )[0];
    if (!instrument) return null;
    if (quotedSince) {
      const cachedQuote = (
        await this.database
          .select({ id: quotes.id })
          .from(quotes)
          .where(
            and(
              eq(quotes.instrumentId, instrument.internalId),
              eq(quotes.provider, "BRAPI"),
              gte(quotes.ingestedAt, quotedSince),
            ),
          )
          .orderBy(desc(quotes.ingestedAt))
          .limit(1)
      )[0];
      if (!cachedQuote) return null;
    }
    return {
      id: instrument.id,
      symbol: instrument.symbol,
      market: instrument.market,
      name: instrument.name,
      currency: instrument.currency,
      type: instrument.type,
      logoUrl:
        typeof instrument.metadata === "object" &&
        instrument.metadata !== null &&
        "logoUrl" in instrument.metadata &&
        typeof instrument.metadata.logoUrl === "string"
          ? instrument.metadata.logoUrl
          : null,
    };
  }

  async tryReserveProviderRequest(
    provider: string,
    intervalMs: number,
    now: Date,
  ): Promise<boolean> {
    const nextAllowedAt = new Date(now.getTime() + intervalMs);
    const rows = await this.database
      .insert(marketProviderRateLimits)
      .values({ provider, nextAllowedAt, updatedAt: now })
      .onConflictDoUpdate({
        target: marketProviderRateLimits.provider,
        set: { nextAllowedAt, updatedAt: now },
        where: lte(marketProviderRateLimits.nextAllowedAt, now),
      })
      .returning({ provider: marketProviderRateLimits.provider });
    return rows.length === 1;
  }
}
