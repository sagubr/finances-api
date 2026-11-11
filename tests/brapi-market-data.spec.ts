import { BrapiMarketDataProvider } from "#/modules/wealth/infrastructure/integrations/brapi-market-data.provider.js";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("BrapiMarketDataProvider", () => {
  it("normalizes v2 quotes and sends the token only in the authorization header", async () => {
    const request = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                requestedSymbol: "PETR4",
                symbol: "PETR4",
                changed: false,
                data: {
                  shortName: "PETROBRAS PN",
                  longName: "Petróleo Brasileiro S.A.",
                  currency: "BRL",
                  regularMarketPrice: 41.18,
                  regularMarketChange: -0.58,
                  regularMarketChangePercent: -1.39,
                  regularMarketTime: "2026-11-10T17:00:00.000Z",
                },
              },
            ],
            requestedAt: "2026-11-10T17:00:01.000Z",
            took: 32,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", request);
    const provider = new BrapiMarketDataProvider({
      apiKey: "secret-token",
      baseUrl: "https://brapi.dev/api/v2",
      timeoutMs: 10_000,
    });

    const result = await provider.fetchQuotes([" petr4 "]);

    expect(result.quotes).toEqual([
      expect.objectContaining({
        requestedSymbol: "PETR4",
        symbol: "PETR4",
        name: "Petróleo Brasileiro S.A.",
        currency: "BRL",
        price: "41.18",
        dayChange: "-0.58",
        dayChangePercent: "-1.39",
      }),
    ]);
    const [url, options] = request.mock.calls[0] ?? [];
    const requestedUrl = typeof url === "string" ? url : url instanceof URL ? url.href : url?.url;
    expect(requestedUrl).toBe("https://brapi.dev/api/v2/stocks/quote?symbols=PETR4");
    expect(requestedUrl).not.toContain("secret-token");
    expect((options?.headers as Headers).get("Authorization")).toBe("Bearer secret-token");
  });

  it("maps provider throttling to an actionable application error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ code: "RATE_LIMIT" }), {
            status: 429,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const provider = new BrapiMarketDataProvider({
      baseUrl: "https://brapi.dev/api/v2",
      timeoutMs: 10_000,
    });

    await expect(provider.fetchQuotes(["VALE3"])).rejects.toMatchObject({
      category: "rate-limit",
      code: "MARKET_PROVIDER_RATE_LIMITED",
    });
  });
});
