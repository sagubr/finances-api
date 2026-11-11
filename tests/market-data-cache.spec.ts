import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IMarketDataCatalog } from "#/modules/wealth/application/ports/market-data-catalog.js";
import type {
  IMarketDataProvider,
  ProviderQuoteBatch,
} from "#/modules/wealth/application/ports/market-data-provider.js";
import { RefreshMarketQuotesUseCase } from "#/modules/wealth/application/use-cases/refresh-market-quotes.use-case.js";
import { ResolveInstrumentUseCase } from "#/modules/wealth/application/use-cases/resolve-instrument.use-case.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: crypto.randomUUID(),
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: crypto.randomUUID(),
  role: "OWNER",
  requestId: "market-cache",
};
const instrument = {
  id: crypto.randomUUID(),
  symbol: "PETR4",
  market: "B3",
  name: "Petróleo Brasileiro S.A.",
  currency: "BRL",
  type: "STOCK" as const,
};
const batch: ProviderQuoteBatch = {
  provider: "BRAPI",
  endpoint: "/stocks/quote",
  requestedSymbols: ["PETR4"],
  requestedAt: new Date("2026-11-10T12:00:00.000Z"),
  receivedAt: new Date("2026-11-10T12:00:01.000Z"),
  httpStatus: 200,
  rawPayload: {},
  quotes: [],
};

const provider = (fetchQuotes = vi.fn(() => Promise.resolve(batch))): IMarketDataProvider => ({
  fetchQuotes,
});

const catalog = (overrides: Partial<IMarketDataCatalog> = {}): IMarketDataCatalog => ({
  saveQuoteBatch: vi.fn(() => Promise.resolve([instrument])),
  listSymbolsInUse: vi.fn(() => Promise.resolve(["PETR4"])),
  findInstrument: vi.fn(() => Promise.resolve(null)),
  tryReserveProviderRequest: vi.fn(() => Promise.resolve(true)),
  ...overrides,
});

const options = {
  cacheMs: 30 * 60_000,
  minRequestIntervalMs: 60_000,
  now: () => new Date("2026-11-10T12:30:00.000Z"),
};

describe("market data cache and rate limit", () => {
  it("returns a cached instrument without spending a Brapi request", async () => {
    const fetchQuotes = vi.fn(() => Promise.resolve(batch));
    const reserve = vi.fn(() => Promise.resolve(true));
    const useCase = new ResolveInstrumentUseCase(
      provider(fetchQuotes),
      catalog({
        findInstrument: vi.fn(() => Promise.resolve(instrument)),
        tryReserveProviderRequest: reserve,
      }),
      options,
    );

    await expect(useCase.execute(context, "petr4")).resolves.toEqual(instrument);
    expect(fetchQuotes).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });

  it("uses stale cached data when another process owns the provider rate-limit slot", async () => {
    const fetchQuotes = vi.fn(() => Promise.resolve(batch));
    const findInstrument = vi
      .fn<IWealthFindInstrument>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(instrument);
    const useCase = new ResolveInstrumentUseCase(
      provider(fetchQuotes),
      catalog({
        findInstrument,
        tryReserveProviderRequest: vi.fn(() => Promise.resolve(false)),
      }),
      options,
    );

    await expect(useCase.execute(context, "PETR4")).resolves.toEqual(instrument);
    expect(fetchQuotes).not.toHaveBeenCalled();
  });

  it("refreshes every stale ticker in one batched request", async () => {
    const fetchQuotes = vi.fn(() => Promise.resolve(batch));
    const saveQuoteBatch = vi.fn(() => Promise.resolve([instrument]));
    const useCase = new RefreshMarketQuotesUseCase(
      provider(fetchQuotes),
      catalog({
        listSymbolsInUse: vi.fn(() => Promise.resolve(["PETR4", "VALE3", "ITUB4"])),
        saveQuoteBatch,
      }),
      options,
    );

    await useCase.execute();

    expect(fetchQuotes).toHaveBeenCalledOnce();
    expect(fetchQuotes).toHaveBeenCalledWith(["PETR4", "VALE3", "ITUB4"]);
    expect(saveQuoteBatch).toHaveBeenCalledWith(batch);
  });
});

type IWealthFindInstrument = IMarketDataCatalog["findInstrument"];
