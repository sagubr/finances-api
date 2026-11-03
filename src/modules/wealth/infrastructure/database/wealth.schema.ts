import {
  identity,
  publicId,
  tenantIndex,
  tenantPolicy,
  timestamps,
} from "#/infrastructure/database/schema.helpers.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const instrumentType = pgEnum("instrument_type", [
  "STOCK",
  "ETF",
  "FUND",
  "BOND",
  "CRYPTO",
  "CURRENCY",
  "OTHER",
]);
export const orderSide = pgEnum("investment_order_side", ["BUY", "SELL"]);
export const assetValuationMethod = pgEnum("asset_valuation_method", [
  "COST",
  "LINEAR_DEPRECIATION",
  "MARKET",
]);
export const assetStatus = pgEnum("asset_status", ["PLANNED", "ACTIVE", "SOLD", "ARCHIVED"]);

export const instruments = pgTable(
  "instruments",
  {
    id: identity(),
    publicId: publicId(),
    symbol: varchar("symbol", { length: 40 }).notNull(),
    market: varchar("market", { length: 40 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    type: instrumentType("type").notNull(),
    active: boolean("active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("instruments_symbol_market_currency_unique").on(
      table.symbol,
      table.market,
      table.currency,
    ),
  ],
);

export const instrumentProviderMappings = pgTable(
  "instrument_provider_mappings",
  {
    id: identity(),
    instrumentId: bigint("instrument_id", { mode: "bigint" })
      .notNull()
      .references(() => instruments.id),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerSymbol: varchar("provider_symbol", { length: 120 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    uniqueIndex("instrument_provider_mapping_unique").on(table.provider, table.providerSymbol),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: identity(),
    instrumentId: bigint("instrument_id", { mode: "bigint" })
      .notNull()
      .references(() => instruments.id),
    price: numeric("price", { precision: 30, scale: 10 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    marketAt: timestamp("market_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    quality: varchar("quality", { length: 30 }).notNull(),
  },
  (table) => [index("quotes_instrument_market_idx").on(table.instrumentId, table.marketAt)],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    id: identity(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    quoteCurrency: varchar("quote_currency", { length: 3 }).notNull(),
    rate: numeric("rate", { precision: 30, scale: 12 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    marketAt: timestamp("market_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fx_rates_pair_market_idx").on(table.baseCurrency, table.quoteCurrency, table.marketAt),
  ],
);

export const quoteRejections = pgTable("quote_rejections", {
  id: identity(),
  instrumentId: bigint("instrument_id", { mode: "bigint" }).references(() => instruments.id),
  provider: varchar("provider", { length: 80 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
  reason: varchar("reason", { length: 200 }).notNull(),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instrumentRequests = pgTable(
  "instrument_requests",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    symbol: varchar("symbol", { length: 40 }).notNull(),
    market: varchar("market", { length: 40 }),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),
    ...timestamps,
  },
  (table) => [
    tenantIndex("instrument_requests", table.workspaceId),
    tenantPolicy("instrument_requests", table.workspaceId),
  ],
).enableRLS();

export const investmentOrders = pgTable(
  "investment_orders",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    investmentAccountId: bigint("investment_account_id", { mode: "bigint" })
      .notNull()
      .references(() => accounts.id),
    instrumentId: bigint("instrument_id", { mode: "bigint" })
      .notNull()
      .references(() => instruments.id),
    side: orderSide("side").notNull(),
    quantity: numeric("quantity", { precision: 30, scale: 12 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 30, scale: 10 }).notNull(),
    fees: numeric("fees", { precision: 30, scale: 10 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull(),
    tradedOn: date("traded_on").notNull(),
    transactionId: bigint("transaction_id", { mode: "bigint" }).references(() => transactions.id),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check("investment_orders_quantity_positive", sql`${table.quantity} > 0`),
    check("investment_orders_price_nonnegative", sql`${table.unitPrice} >= 0`),
    tenantIndex("investment_orders", table.workspaceId),
    tenantPolicy("investment_orders", table.workspaceId),
  ],
).enableRLS();

export const positionProjections = pgTable(
  "position_projections",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    investmentAccountId: bigint("investment_account_id", { mode: "bigint" })
      .notNull()
      .references(() => accounts.id),
    instrumentId: bigint("instrument_id", { mode: "bigint" })
      .notNull()
      .references(() => instruments.id),
    quantity: numeric("quantity", { precision: 30, scale: 12 }).notNull(),
    averageCost: numeric("average_cost", { precision: 30, scale: 10 }).notNull(),
    totalCost: numeric("total_cost", { precision: 30, scale: 10 }).notNull(),
    sourceVersion: integer("source_version").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("position_projection_unique").on(table.investmentAccountId, table.instrumentId),
    tenantIndex("position_projections", table.workspaceId),
    tenantPolicy("position_projections", table.workspaceId),
  ],
).enableRLS();

export const realizedResults = pgTable(
  "realized_results",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    orderId: bigint("order_id", { mode: "bigint" })
      .notNull()
      .references(() => investmentOrders.id),
    proceeds: numeric("proceeds", { precision: 30, scale: 10 }).notNull(),
    allocatedCost: numeric("allocated_cost", { precision: 30, scale: 10 }).notNull(),
    fees: numeric("fees", { precision: 30, scale: 10 }).notNull(),
    result: numeric("result", { precision: 30, scale: 10 }).notNull(),
  },
  (table) => [
    uniqueIndex("realized_results_order_unique").on(table.orderId),
    tenantIndex("realized_results", table.workspaceId),
    tenantPolicy("realized_results", table.workspaceId),
  ],
).enableRLS();

export const dividends = pgTable(
  "dividends",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    instrumentId: bigint("instrument_id", { mode: "bigint" })
      .notNull()
      .references(() => instruments.id),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    receivedOn: date("received_on").notNull(),
    transactionId: bigint("transaction_id", { mode: "bigint" }).references(() => transactions.id),
    ...timestamps,
  },
  (table) => [
    tenantIndex("dividends", table.workspaceId),
    tenantPolicy("dividends", table.workspaceId),
  ],
).enableRLS();

export const fixedIncomeHoldings = pgTable(
  "fixed_income_holdings",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 160 }).notNull(),
    principalCents: bigint("principal_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    rateType: varchar("rate_type", { length: 40 }).notNull(),
    investedOn: date("invested_on").notNull(),
    maturesOn: date("matures_on"),
    ...timestamps,
  },
  (table) => [
    tenantIndex("fixed_income_holdings", table.workspaceId),
    tenantPolicy("fixed_income_holdings", table.workspaceId),
  ],
).enableRLS();

export const allocationPlans = pgTable(
  "allocation_plans",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    tenantIndex("allocation_plans", table.workspaceId),
    tenantPolicy("allocation_plans", table.workspaceId),
  ],
).enableRLS();

export const allocationTargets = pgTable(
  "allocation_targets",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    planId: bigint("plan_id", { mode: "bigint" })
      .notNull()
      .references(() => allocationPlans.id),
    instrumentId: bigint("instrument_id", { mode: "bigint" }).references(() => instruments.id),
    assetClass: varchar("asset_class", { length: 80 }),
    targetBps: integer("target_bps").notNull(),
  },
  (table) => [
    check("allocation_targets_range", sql`${table.targetBps} between 0 and 10000`),
    tenantIndex("allocation_targets", table.workspaceId),
    tenantPolicy("allocation_targets", table.workspaceId),
  ],
).enableRLS();

export const growthPlans = pgTable(
  "growth_plans",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    initialAmountCents: bigint("initial_amount_cents", { mode: "bigint" }).notNull(),
    monthlyContributionCents: bigint("monthly_contribution_cents", { mode: "bigint" }).notNull(),
    annualRate: numeric("annual_rate", { precision: 18, scale: 8 }).notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    assumptions: jsonb("assumptions").notNull().default({}),
    ...timestamps,
  },
  (table) => [
    tenantIndex("growth_plans", table.workspaceId),
    tenantPolicy("growth_plans", table.workspaceId),
  ],
).enableRLS();

export const assetCategories = pgTable(
  "asset_categories",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    ...timestamps,
  },
  (table) => [
    tenantIndex("asset_categories", table.workspaceId),
    tenantPolicy("asset_categories", table.workspaceId),
  ],
).enableRLS();

export const assets = pgTable(
  "assets",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    categoryId: bigint("category_id", { mode: "bigint" }).references(() => assetCategories.id),
    name: varchar("name", { length: 160 }).notNull(),
    status: assetStatus("status").notNull(),
    acquiredOn: date("acquired_on"),
    acquisitionCostCents: bigint("acquisition_cost_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    valuationMethod: assetValuationMethod("valuation_method").notNull(),
    usefulLifeMonths: integer("useful_life_months"),
    residualValueCents: bigint("residual_value_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    check(
      "assets_cost_nonnegative",
      sql`${table.acquisitionCostCents} >= 0 and ${table.residualValueCents} >= 0 and ${table.residualValueCents} <= ${table.acquisitionCostCents}`,
    ),
    tenantIndex("assets", table.workspaceId),
    tenantPolicy("assets", table.workspaceId),
  ],
).enableRLS();

export const assetCostEvents = pgTable(
  "asset_cost_events",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    assetId: bigint("asset_id", { mode: "bigint" })
      .notNull()
      .references(() => assets.id),
    occurredOn: date("occurred_on").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    capitalizable: boolean("capitalizable").notNull(),
  },
  (table) => [
    tenantIndex("asset_cost_events", table.workspaceId),
    tenantPolicy("asset_cost_events", table.workspaceId),
  ],
).enableRLS();

export const assetValuations = pgTable(
  "asset_valuations",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    assetId: bigint("asset_id", { mode: "bigint" })
      .notNull()
      .references(() => assets.id),
    valuedOn: date("valued_on").notNull(),
    valueCents: bigint("value_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    source: varchar("source", { length: 200 }).notNull(),
  },
  (table) => [
    index("asset_valuations_asset_date_idx").on(table.assetId, table.valuedOn),
    tenantIndex("asset_valuations", table.workspaceId),
    tenantPolicy("asset_valuations", table.workspaceId),
  ],
).enableRLS();

export const assetSales = pgTable(
  "asset_sales",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    assetId: bigint("asset_id", { mode: "bigint" })
      .notNull()
      .references(() => assets.id)
      .unique(),
    soldOn: date("sold_on").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    transactionId: bigint("transaction_id", { mode: "bigint" }).references(() => transactions.id),
    ...timestamps,
  },
  (table) => [
    tenantIndex("asset_sales", table.workspaceId),
    tenantPolicy("asset_sales", table.workspaceId),
  ],
).enableRLS();

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    snapshotOn: date("snapshot_on").notNull(),
    revision: integer("revision").notNull().default(1),
    totalAssetsCents: bigint("total_assets_cents", { mode: "bigint" }).notNull(),
    totalLiabilitiesCents: bigint("total_liabilities_cents", { mode: "bigint" }).notNull(),
    netWorthCents: bigint("net_worth_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    sourceVersions: jsonb("source_versions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("net_worth_snapshot_revision_unique").on(
      table.workspaceId,
      table.snapshotOn,
      table.revision,
    ),
    tenantPolicy("net_worth_snapshots", table.workspaceId),
  ],
).enableRLS();

export const netWorthSnapshotComponents = pgTable(
  "net_worth_snapshot_components",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    snapshotId: bigint("snapshot_id", { mode: "bigint" })
      .notNull()
      .references(() => netWorthSnapshots.id),
    componentType: varchar("component_type", { length: 60 }).notNull(),
    componentPublicId: uuid("component_public_id"),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    sourceVersion: integer("source_version"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    tenantIndex("net_worth_snapshot_components", table.workspaceId),
    tenantPolicy("net_worth_snapshot_components", table.workspaceId),
  ],
).enableRLS();
