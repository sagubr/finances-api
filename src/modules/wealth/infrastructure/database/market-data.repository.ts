import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IWealthRepository } from "#/modules/wealth/application/ports/wealth.repository.js";
import { instruments, quotes } from "#/modules/wealth/infrastructure/database/wealth.schema.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";

type MarketDataPort = Pick<IWealthRepository, "listInstruments" | "getQuote">;

export class MarketDataRepository implements MarketDataPort {
  constructor(private readonly database: TenantDatabase) {}

  async listInstruments(query: Parameters<MarketDataPort["listInstruments"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const search = query.q ?? "";
    const pattern = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const rows = await this.database
      .select({
        id: instruments.publicId,
        symbol: instruments.symbol,
        market: instruments.market,
        name: instruments.name,
        currency: instruments.currency,
        type: instruments.type,
      })
      .from(instruments)
      .where(
        and(
          eq(instruments.active, true),
          or(ilike(instruments.symbol, pattern), ilike(instruments.name, pattern)),
          ...(cursor ? [lt(instruments.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(instruments.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows, query.limit);
  }

  async getQuote(id: string) {
    const instrument = (
      await this.database
        .select({ id: instruments.id, publicId: instruments.publicId })
        .from(instruments)
        .where(eq(instruments.publicId, id))
        .limit(1)
    )[0];
    if (!instrument) return null;
    const quote = (
      await this.database
        .select({
          price: quotes.price,
          currency: quotes.currency,
          provider: quotes.provider,
          marketAt: quotes.marketAt,
          ingestedAt: quotes.ingestedAt,
        })
        .from(quotes)
        .where(eq(quotes.instrumentId, instrument.id))
        .orderBy(desc(quotes.marketAt))
        .limit(1)
    )[0];
    if (!quote) return null;
    return {
      id: instrument.publicId,
      price: quote.price,
      currency: quote.currency,
      provider: quote.provider,
      marketAt: quote.marketAt.toISOString(),
      ingestedAt: quote.ingestedAt.toISOString(),
      stale: Date.now() - quote.marketAt.getTime() > 86_400_000,
    };
  }
}
