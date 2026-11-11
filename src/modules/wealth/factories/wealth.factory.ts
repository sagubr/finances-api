import { runtimeConfig } from "#/config/runtime.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { CalculatePayrollUseCase } from "#/modules/wealth/application/use-cases/calculate-payroll.use-case.js";
import { CreateAssetValuationUseCase } from "#/modules/wealth/application/use-cases/create-asset-valuation.use-case.js";
import { CreateAssetUseCase } from "#/modules/wealth/application/use-cases/create-asset.use-case.js";
import { CreateOrderUseCase } from "#/modules/wealth/application/use-cases/create-order.use-case.js";
import { DeleteAssetUseCase } from "#/modules/wealth/application/use-cases/delete-asset.use-case.js";
import { DeleteOrderUseCase } from "#/modules/wealth/application/use-cases/delete-order.use-case.js";
import { GetNetWorthUseCase } from "#/modules/wealth/application/use-cases/get-net-worth.use-case.js";
import { GetQuoteUseCase } from "#/modules/wealth/application/use-cases/get-quote.use-case.js";
import { ListAssetsUseCase } from "#/modules/wealth/application/use-cases/list-assets.use-case.js";
import { ListInstrumentsUseCase } from "#/modules/wealth/application/use-cases/list-instruments.use-case.js";
import { ListOrdersUseCase } from "#/modules/wealth/application/use-cases/list-orders.use-case.js";
import { ListPositionsUseCase } from "#/modules/wealth/application/use-cases/list-positions.use-case.js";
import { ResolveInstrumentUseCase } from "#/modules/wealth/application/use-cases/resolve-instrument.use-case.js";
import { UpdateAssetUseCase } from "#/modules/wealth/application/use-cases/update-asset.use-case.js";
import { UpdateOrderUseCase } from "#/modules/wealth/application/use-cases/update-order.use-case.js";
import { MarketDataCatalogRepository } from "#/modules/wealth/infrastructure/database/market-data-catalog.repository.js";
import { WealthUnitOfWork } from "#/modules/wealth/infrastructure/database/wealth.unit-of-work.js";
import { BrapiMarketDataProvider } from "#/modules/wealth/infrastructure/integrations/brapi-market-data.provider.js";
import {
  CalculatePayrollController,
  CreateAssetController,
  CreateAssetValuationController,
  CreateOrderController,
  DeleteAssetController,
  DeleteOrderController,
  GetNetWorthController,
  GetQuoteController,
  ListAssetsController,
  ListInstrumentsController,
  ListOrdersController,
  ListPositionsController,
  ResolveInstrumentController,
  UpdateAssetController,
  UpdateOrderController,
} from "#/modules/wealth/presentation/controllers/wealth.controller.js";
import { v7 as uuidv7 } from "uuid";
const unitOfWork = new WealthUnitOfWork(db);
const marketDataProvider = new BrapiMarketDataProvider({
  ...(runtimeConfig.brapiApiKey ? { apiKey: runtimeConfig.brapiApiKey } : {}),
  baseUrl: runtimeConfig.brapiBaseUrl,
  timeoutMs: runtimeConfig.brapiTimeoutMs,
});
const marketDataCatalog = new MarketDataCatalogRepository(db, uuidv7);
const now = () => new Date();
export const wealthControllers = {
  instruments: new ListInstrumentsController(new ListInstrumentsUseCase(unitOfWork)),
  resolveInstrument: new ResolveInstrumentController(
    new ResolveInstrumentUseCase(marketDataProvider, marketDataCatalog, {
      cacheMs: runtimeConfig.marketQuoteCacheMinutes * 60_000,
      minRequestIntervalMs: runtimeConfig.brapiMinRequestIntervalMs,
      now,
    }),
  ),
  quote: new GetQuoteController(new GetQuoteUseCase(unitOfWork)),
  orders: new ListOrdersController(new ListOrdersUseCase(unitOfWork)),
  positions: new ListPositionsController(new ListPositionsUseCase(unitOfWork)),
  createOrder: new CreateOrderController(new CreateOrderUseCase(unitOfWork, uuidv7)),
  updateOrder: new UpdateOrderController(new UpdateOrderUseCase(unitOfWork)),
  deleteOrder: new DeleteOrderController(new DeleteOrderUseCase(unitOfWork)),
  assets: new ListAssetsController(new ListAssetsUseCase(unitOfWork)),
  createAsset: new CreateAssetController(new CreateAssetUseCase(unitOfWork, uuidv7)),
  updateAsset: new UpdateAssetController(new UpdateAssetUseCase(unitOfWork)),
  deleteAsset: new DeleteAssetController(new DeleteAssetUseCase(unitOfWork)),
  createAssetValuation: new CreateAssetValuationController(
    new CreateAssetValuationUseCase(unitOfWork, uuidv7),
  ),
  netWorth: new GetNetWorthController(new GetNetWorthUseCase(unitOfWork, now)),
  payroll: new CalculatePayrollController(new CalculatePayrollUseCase()),
} as const;
