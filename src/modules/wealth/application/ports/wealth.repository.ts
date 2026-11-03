import type {
  AssetInput,
  AssetPatch,
  AssetValuationInput,
  AssetValuationView,
  AssetView,
  InstrumentView,
  InvestmentAccountView,
  NetWorthView,
  OrderInput,
  OrderMutationView,
  OrderPatch,
  OrderView,
  PositionProjectionView,
  QuoteView,
} from "#/modules/wealth/dtos/wealth.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
export interface IWealthRepository {
  listInstruments(
    query: CursorPaginationQuery & { q?: string | undefined },
  ): Promise<CursorPage<InstrumentView>>;
  getQuote(id: string): Promise<QuoteView | null>;
  listInvestmentAccounts(query: CursorPaginationQuery): Promise<CursorPage<InvestmentAccountView>>;
  listOrders(query: CursorPaginationQuery): Promise<CursorPage<OrderView>>;
  listPositions(query: CursorPaginationQuery): Promise<CursorPage<PositionProjectionView>>;
  createOrder(id: string, input: OrderInput): Promise<OrderView>;
  updateOrder(id: string, input: OrderPatch): Promise<OrderMutationView>;
  deleteOrder(id: string, expectedVersion: number): Promise<void>;
  listAssets(query: CursorPaginationQuery): Promise<CursorPage<AssetView>>;
  createAsset(id: string, input: AssetInput): Promise<AssetView>;
  updateAsset(id: string, input: AssetPatch): Promise<AssetView>;
  archiveAsset(id: string, expectedVersion: number): Promise<void>;
  createAssetValuation(
    id: string,
    assetId: string,
    input: AssetValuationInput,
  ): Promise<AssetValuationView>;
  getNetWorth(referenceOn: string, calculatedAt: string): Promise<NetWorthView>;
}
