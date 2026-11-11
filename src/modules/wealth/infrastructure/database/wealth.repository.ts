import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { outboxEvents } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import type { IWealthRepository } from "#/modules/wealth/application/ports/wealth.repository.js";
import { calculateLinearDepreciation } from "#/modules/wealth/domain/depreciation.js";
import { calculatePosition } from "#/modules/wealth/domain/position-calculator.js";
import type {
  AssetInput,
  AssetPatch,
  AssetValuationInput,
  OrderInput,
  OrderPatch,
} from "#/modules/wealth/dtos/wealth.dto.js";
import { MarketDataRepository } from "#/modules/wealth/infrastructure/database/market-data.repository.js";
import {
  assetCategories,
  assets,
  assetValuations,
  instruments,
  investmentOrders,
  positionProjections,
  quotes,
} from "#/modules/wealth/infrastructure/database/wealth.schema.js";
import {
  mapAccountComponent,
  mapAsset,
  mapAssetComponent,
  mapInvestmentComponent,
  mapPositionProjection,
} from "#/modules/wealth/mappers/wealth.mapper.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, asc, desc, eq, isNull, lt, lte, sql } from "drizzle-orm";

export class WealthRepository implements IWealthRepository {
  private readonly marketData: MarketDataRepository;

  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
    private readonly generateId: () => string,
  ) {
    this.marketData = new MarketDataRepository(database);
  }

  async listInstruments(query: Parameters<IWealthRepository["listInstruments"]>[0]) {
    return this.marketData.listInstruments(query);
  }

  async getQuote(id: string) {
    return this.marketData.getQuote(id);
  }

  async listOrders(query: Parameters<IWealthRepository["listOrders"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        id: investmentOrders.publicId,
        accountId: accounts.publicId,
        instrumentId: instruments.publicId,
        symbol: instruments.symbol,
        side: investmentOrders.side,
        quantity: investmentOrders.quantity,
        unitPrice: investmentOrders.unitPrice,
        fees: investmentOrders.fees,
        currency: investmentOrders.currency,
        tradedOn: investmentOrders.tradedOn,
        version: investmentOrders.version,
      })
      .from(investmentOrders)
      .innerJoin(accounts, eq(accounts.id, investmentOrders.investmentAccountId))
      .innerJoin(instruments, eq(instruments.id, investmentOrders.instrumentId))
      .where(
        and(
          eq(investmentOrders.workspaceId, this.context.workspaceId),
          isNull(investmentOrders.deletedAt),
          ...(cursor ? [lt(investmentOrders.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(investmentOrders.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows, query.limit);
  }

  async listPositions(query: Parameters<IWealthRepository["listPositions"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        cursorId: positionProjections.id,
        accountId: accounts.publicId,
        instrumentId: instruments.publicId,
        orderId: sql<string | null>`(
          select latest_order.public_id from ${investmentOrders} latest_order
          where latest_order.investment_account_id = ${positionProjections.investmentAccountId}
            and latest_order.instrument_id = ${positionProjections.instrumentId}
            and latest_order.workspace_id = ${positionProjections.workspaceId}
            and latest_order.deleted_at is null
          order by latest_order.traded_on desc, latest_order.id desc limit 1
        )`,
        orderVersion: sql<number | null>`(
          select latest_order.version from ${investmentOrders} latest_order
          where latest_order.investment_account_id = ${positionProjections.investmentAccountId}
            and latest_order.instrument_id = ${positionProjections.instrumentId}
            and latest_order.workspace_id = ${positionProjections.workspaceId}
            and latest_order.deleted_at is null
          order by latest_order.traded_on desc, latest_order.id desc limit 1
        )`,
        orderQuantity: sql<string | null>`(
          select latest_order.quantity from ${investmentOrders} latest_order
          where latest_order.investment_account_id = ${positionProjections.investmentAccountId}
            and latest_order.instrument_id = ${positionProjections.instrumentId}
            and latest_order.workspace_id = ${positionProjections.workspaceId}
            and latest_order.deleted_at is null
          order by latest_order.traded_on desc, latest_order.id desc limit 1
        )`,
        orderUnitPrice: sql<string | null>`(
          select latest_order.unit_price from ${investmentOrders} latest_order
          where latest_order.investment_account_id = ${positionProjections.investmentAccountId}
            and latest_order.instrument_id = ${positionProjections.instrumentId}
            and latest_order.workspace_id = ${positionProjections.workspaceId}
            and latest_order.deleted_at is null
          order by latest_order.traded_on desc, latest_order.id desc limit 1
        )`,
        orderFees: sql<string | null>`(
          select latest_order.fees from ${investmentOrders} latest_order
          where latest_order.investment_account_id = ${positionProjections.investmentAccountId}
            and latest_order.instrument_id = ${positionProjections.instrumentId}
            and latest_order.workspace_id = ${positionProjections.workspaceId}
            and latest_order.deleted_at is null
          order by latest_order.traded_on desc, latest_order.id desc limit 1
        )`,
        orderTradedOn: sql<string | null>`(
          select latest_order.traded_on from ${investmentOrders} latest_order
          where latest_order.investment_account_id = ${positionProjections.investmentAccountId}
            and latest_order.instrument_id = ${positionProjections.instrumentId}
            and latest_order.workspace_id = ${positionProjections.workspaceId}
            and latest_order.deleted_at is null
          order by latest_order.traded_on desc, latest_order.id desc limit 1
        )`,
        symbol: instruments.symbol,
        name: instruments.name,
        quantity: positionProjections.quantity,
        averageCost: positionProjections.averageCost,
        totalCost: positionProjections.totalCost,
        currency: instruments.currency,
        logoUrl: sql<string | null>`(${instruments.metadata} ->> 'logoUrl')`,
        sourceVersion: positionProjections.sourceVersion,
        calculatedAt: positionProjections.calculatedAt,
        latestPrice: sql<string | null>`(
          select ${quotes.price}
          from ${quotes}
          where ${quotes.instrumentId} = ${positionProjections.instrumentId}
          order by ${quotes.marketAt} desc
          limit 1
        )`,
        quoteAt: sql<string | null>`(
          select ${quotes.marketAt}
          from ${quotes}
          where ${quotes.instrumentId} = ${positionProjections.instrumentId}
          order by ${quotes.marketAt} desc
          limit 1
        )`,
        quoteIngestedAt: sql<string | null>`(
          select ${quotes.ingestedAt}
          from ${quotes}
          where ${quotes.instrumentId} = ${positionProjections.instrumentId}
          order by ${quotes.marketAt} desc
          limit 1
        )`,
        quoteProvider: sql<string | null>`(
          select ${quotes.provider}
          from ${quotes}
          where ${quotes.instrumentId} = ${positionProjections.instrumentId}
          order by ${quotes.marketAt} desc
          limit 1
        )`,
        dayChange: sql<string | null>`(
          select ${quotes.dayChange}
          from ${quotes}
          where ${quotes.instrumentId} = ${positionProjections.instrumentId}
          order by ${quotes.marketAt} desc
          limit 1
        )`,
        dayChangePercent: sql<string | null>`(
          select ${quotes.dayChangePercent}
          from ${quotes}
          where ${quotes.instrumentId} = ${positionProjections.instrumentId}
          order by ${quotes.marketAt} desc
          limit 1
        )`,
      })
      .from(positionProjections)
      .innerJoin(accounts, eq(accounts.id, positionProjections.investmentAccountId))
      .innerJoin(instruments, eq(instruments.id, positionProjections.instrumentId))
      .where(
        and(
          eq(positionProjections.workspaceId, this.context.workspaceId),
          eq(accounts.active, true),
          isNull(accounts.deletedAt),
          sql`${positionProjections.quantity} <> 0`,
          ...(cursor ? [lt(positionProjections.id, BigInt(cursor))] : []),
        ),
      )
      .orderBy(desc(positionProjections.id))
      .limit(query.limit + 1);
    const page = createCursorPage(rows, query.limit, (row) => row.cursorId.toString());
    return {
      pageInfo: page.pageInfo,
      items: page.items.map(mapPositionProjection),
    };
  }

  async createOrder(id: string, input: OrderInput) {
    const relation = await this.resolveInvestmentRelation(input.accountId, input.instrumentId);
    if (!relation || relation.currency !== input.currency)
      throw new ApplicationError("Conta ou instrumento não encontrado.", {
        category: "validation",
        code: "ORDER_RELATION_INVALID",
      });
    await this.database.insert(investmentOrders).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      investmentAccountId: relation.accountId,
      instrumentId: relation.instrumentId,
      side: input.side,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      fees: input.fees,
      currency: input.currency,
      tradedOn: input.tradedOn,
    });
    const position = await this.recalculatePosition(relation.accountId, relation.instrumentId);
    const correlationId = this.generateId();
    await this.database.insert(outboxEvents).values([
      {
        eventId: this.generateId(),
        workspaceId: this.context.workspaceId,
        eventName: "OrderRecorded",
        eventVersion: 1,
        aggregateType: "investment_order",
        aggregatePublicId: id,
        aggregateVersion: 1,
        correlationId,
        payload: {
          id,
          side: input.side,
          quantity: input.quantity,
          instrumentId: input.instrumentId,
        },
        occurredAt: new Date(),
      },
      {
        eventId: this.generateId(),
        workspaceId: this.context.workspaceId,
        eventName: "PositionsRecalculated",
        eventVersion: 1,
        aggregateType: "instrument",
        aggregatePublicId: input.instrumentId,
        aggregateVersion: 1,
        correlationId,
        payload: { instrumentId: input.instrumentId, quantity: position.quantity },
        occurredAt: new Date(),
      },
    ]);
    return { id, ...input, position, version: 1 };
  }

  async updateOrder(id: string, input: OrderPatch) {
    const rows = await this.database
      .update(investmentOrders)
      .set({
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        fees: input.fees,
        tradedOn: input.tradedOn,
        version: sql`${investmentOrders.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(investmentOrders.workspaceId, this.context.workspaceId),
          eq(investmentOrders.publicId, id),
          eq(investmentOrders.version, input.expectedVersion),
          isNull(investmentOrders.deletedAt),
        ),
      )
      .returning({
        id: investmentOrders.publicId,
        investmentAccountId: investmentOrders.investmentAccountId,
        instrumentId: investmentOrders.instrumentId,
        version: investmentOrders.version,
      });
    const order = rows[0];
    if (!order) this.versionConflict();
    try {
      return {
        id: order.id,
        version: order.version,
        position: await this.recalculatePosition(order.investmentAccountId, order.instrumentId),
      };
    } catch (error: unknown) {
      if (error instanceof RangeError)
        throw new ApplicationError("A alteração produziria uma venda acima da posição.", {
          category: "validation",
          code: "POSITION_INSUFFICIENT",
        });
      throw error;
    }
  }

  async deleteOrder(id: string, expectedVersion: number) {
    const rows = await this.database
      .update(investmentOrders)
      .set({
        deletedAt: new Date(),
        version: sql`${investmentOrders.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(investmentOrders.workspaceId, this.context.workspaceId),
          eq(investmentOrders.publicId, id),
          eq(investmentOrders.version, expectedVersion),
          isNull(investmentOrders.deletedAt),
        ),
      )
      .returning({
        investmentAccountId: investmentOrders.investmentAccountId,
        instrumentId: investmentOrders.instrumentId,
      });
    const order = rows[0];
    if (!order) this.versionConflict();
    try {
      await this.recalculatePosition(order.investmentAccountId, order.instrumentId);
    } catch (error: unknown) {
      if (error instanceof RangeError)
        throw new ApplicationError("A exclusão deixaria uma venda sem posição suficiente.", {
          category: "validation",
          code: "POSITION_INSUFFICIENT",
        });
      throw error;
    }
  }

  async listAssets(query: Parameters<IWealthRepository["listAssets"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        id: assets.publicId,
        categoryId: assetCategories.publicId,
        name: assets.name,
        status: assets.status,
        acquiredOn: assets.acquiredOn,
        acquisitionCostCents: assets.acquisitionCostCents,
        currency: assets.currency,
        valuationMethod: assets.valuationMethod,
        usefulLifeMonths: assets.usefulLifeMonths,
        residualValueCents: assets.residualValueCents,
        version: assets.version,
      })
      .from(assets)
      .leftJoin(assetCategories, eq(assetCategories.id, assets.categoryId))
      .where(
        and(
          eq(assets.workspaceId, this.context.workspaceId),
          sql`${assets.status} <> 'ARCHIVED'`,
          ...(cursor ? [lt(assets.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(assets.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapAsset), query.limit);
  }

  async createAsset(id: string, input: AssetInput) {
    const category = input.categoryId
      ? (
          await this.database
            .select({ id: assetCategories.id })
            .from(assetCategories)
            .where(
              and(
                eq(assetCategories.workspaceId, this.context.workspaceId),
                eq(assetCategories.publicId, input.categoryId),
              ),
            )
            .limit(1)
        )[0]
      : null;
    if (input.categoryId && !category)
      throw new ApplicationError("Categoria de bem inválida.", {
        category: "validation",
        code: "ASSET_CATEGORY_INVALID",
      });
    await this.database.insert(assets).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      categoryId: category?.id,
      name: input.name,
      status: input.status,
      acquiredOn: input.acquiredOn,
      acquisitionCostCents: BigInt(input.acquisitionCostCents),
      currency: input.currency,
      valuationMethod: input.valuationMethod,
      usefulLifeMonths: input.usefulLifeMonths,
      residualValueCents: BigInt(input.residualValueCents),
    });
    return {
      id,
      categoryId: input.categoryId ?? null,
      name: input.name,
      status: input.status,
      acquiredOn: input.acquiredOn ?? null,
      acquisitionCostCents: input.acquisitionCostCents,
      currency: input.currency,
      valuationMethod: input.valuationMethod,
      usefulLifeMonths: input.usefulLifeMonths ?? null,
      residualValueCents: input.residualValueCents,
      version: 1,
    };
  }

  async updateAsset(id: string, input: AssetPatch) {
    const category = input.categoryId
      ? (
          await this.database
            .select({ id: assetCategories.id })
            .from(assetCategories)
            .where(
              and(
                eq(assetCategories.workspaceId, this.context.workspaceId),
                eq(assetCategories.publicId, input.categoryId),
              ),
            )
            .limit(1)
        )[0]
      : null;
    if (input.categoryId && !category)
      throw new ApplicationError("Categoria de bem inválida.", {
        category: "validation",
        code: "ASSET_CATEGORY_INVALID",
      });
    const rows = await this.database
      .update(assets)
      .set({
        categoryId: category?.id ?? null,
        name: input.name,
        status: input.status,
        acquiredOn: input.acquiredOn ?? null,
        acquisitionCostCents: BigInt(input.acquisitionCostCents),
        currency: input.currency,
        valuationMethod: input.valuationMethod,
        usefulLifeMonths: input.usefulLifeMonths ?? null,
        residualValueCents: BigInt(input.residualValueCents),
        version: sql`${assets.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assets.workspaceId, this.context.workspaceId),
          eq(assets.publicId, id),
          eq(assets.version, input.expectedVersion),
          sql`${assets.status} <> 'ARCHIVED'`,
        ),
      )
      .returning({ version: assets.version });
    const asset = rows[0];
    if (!asset) this.versionConflict();
    return {
      id,
      categoryId: input.categoryId ?? null,
      name: input.name,
      status: input.status,
      acquiredOn: input.acquiredOn ?? null,
      acquisitionCostCents: input.acquisitionCostCents,
      currency: input.currency,
      valuationMethod: input.valuationMethod,
      usefulLifeMonths: input.usefulLifeMonths ?? null,
      residualValueCents: input.residualValueCents,
      version: asset.version,
    };
  }

  async archiveAsset(id: string, expectedVersion: number) {
    const rows = await this.database
      .update(assets)
      .set({
        status: "ARCHIVED",
        version: sql`${assets.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assets.workspaceId, this.context.workspaceId),
          eq(assets.publicId, id),
          eq(assets.version, expectedVersion),
          sql`${assets.status} <> 'ARCHIVED'`,
        ),
      )
      .returning({ id: assets.id });
    if (!rows[0]) this.versionConflict();
  }

  async createAssetValuation(id: string, assetId: string, input: AssetValuationInput) {
    const asset = (
      await this.database
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.workspaceId, this.context.workspaceId), eq(assets.publicId, assetId)))
        .limit(1)
    )[0];
    if (!asset)
      throw new ApplicationError("Bem não encontrado.", {
        category: "not-found",
        code: "ASSET_NOT_FOUND",
      });
    await this.database.insert(assetValuations).values({
      publicId: id,
      workspaceId: this.context.workspaceId,
      assetId: asset.id,
      valuedOn: input.valuedOn,
      valueCents: BigInt(input.valueCents),
      currency: input.currency,
      source: input.source,
    });
    return { id, assetId, ...input };
  }

  async getNetWorth(referenceOn: string, calculatedAt: string) {
    const assetRows = await this.database
      .select({
        asset: assets,
        latestMarketValue: sql<bigint | null>`(
          select ${assetValuations.valueCents}
          from ${assetValuations}
          where ${assetValuations.assetId} = ${assets.id}
            and ${assetValuations.valuedOn} <= ${referenceOn}
          order by ${assetValuations.valuedOn} desc, ${assetValuations.id} desc
          limit 1
        )`,
      })
      .from(assets)
      .where(and(eq(assets.workspaceId, this.context.workspaceId), eq(assets.status, "ACTIVE")));
    const assetComponents = assetRows.map(({ asset, latestMarketValue }) => {
      const value =
        asset.valuationMethod === "MARKET"
          ? (latestMarketValue ?? asset.acquisitionCostCents)
          : asset.valuationMethod === "LINEAR_DEPRECIATION" &&
              asset.acquiredOn &&
              asset.usefulLifeMonths
            ? calculateLinearDepreciation({
                costCents: asset.acquisitionCostCents,
                residualCents: asset.residualValueCents,
                usefulLifeMonths: asset.usefulLifeMonths,
                acquiredOn: asset.acquiredOn,
                referenceOn,
              })
            : asset.acquisitionCostCents;
      return mapAssetComponent(asset, value);
    });
    const accountRows = await this.database
      .select({
        id: accounts.publicId,
        name: accounts.name,
        currency: accounts.currency,
        opening: accounts.openingBalanceCents,
        movement: sql<bigint>`coalesce(sum(case when ${transactions.deletedAt} is null and ${transactions.status} = 'SETTLED' then case when ${transactions.type} = 'INCOME' then ${transactions.amountCents} when ${transactions.type} in ('EXPENSE','CARD_PAYMENT','INVESTMENT') then -${transactions.amountCents} else 0 end else 0 end), 0)`,
      })
      .from(accounts)
      .leftJoin(
        transactions,
        and(eq(transactions.accountId, accounts.id), lte(transactions.occurredOn, referenceOn)),
      )
      .where(and(eq(accounts.workspaceId, this.context.workspaceId), isNull(accounts.deletedAt)))
      .groupBy(accounts.id);
    const accountComponents = accountRows.map(mapAccountComponent);
    const investmentRows = await this.database
      .select({
        id: instruments.publicId,
        accountName: accounts.name,
        symbol: instruments.symbol,
        currency: accounts.currency,
        valueCents: sql<bigint>`round(
          ${positionProjections.quantity} * coalesce(
            (
              select ${quotes.price}
              from ${quotes}
              where ${quotes.instrumentId} = ${positionProjections.instrumentId}
                and ${quotes.currency} = ${accounts.currency}
                and ${quotes.marketAt} < (${referenceOn}::date + interval '1 day')
              order by ${quotes.marketAt} desc
              limit 1
            ),
            ${positionProjections.averageCost}
          ) * 100
        )::bigint`,
      })
      .from(positionProjections)
      .innerJoin(accounts, eq(accounts.id, positionProjections.investmentAccountId))
      .innerJoin(instruments, eq(instruments.id, positionProjections.instrumentId))
      .where(
        and(
          eq(positionProjections.workspaceId, this.context.workspaceId),
          eq(accounts.active, true),
          isNull(accounts.deletedAt),
          sql`${positionProjections.quantity} <> 0`,
        ),
      );
    const investmentComponents = investmentRows.map(mapInvestmentComponent);
    const components = [...accountComponents, ...investmentComponents, ...assetComponents];
    const totals = new Map<string, number>();
    for (const component of components) {
      const amount = (totals.get(component.currency) ?? 0) + component.valueCents;
      if (!Number.isSafeInteger(amount))
        throw new Error("Aggregated net worth exceeds the safe monetary range.");
      totals.set(component.currency, amount);
    }
    return {
      referenceOn,
      totals: [...totals].map(([currency, amountCents]) => ({ currency, amountCents })),
      components: components.slice(0, 200),
      componentsTruncated: components.length > 200,
      calculatedAt,
    };
  }

  private async resolveInvestmentRelation(accountPublicId: string, instrumentPublicId: string) {
    const account = (
      await this.database
        .select({ id: accounts.id, currency: accounts.currency })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, this.context.workspaceId),
            eq(accounts.publicId, accountPublicId),
            eq(accounts.active, true),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    const instrument = (
      await this.database
        .select({ id: instruments.id, currency: instruments.currency })
        .from(instruments)
        .where(eq(instruments.publicId, instrumentPublicId))
        .limit(1)
    )[0];
    return account && instrument && account.currency === instrument.currency
      ? { accountId: account.id, instrumentId: instrument.id, currency: account.currency }
      : null;
  }

  private async recalculatePosition(investmentAccountId: bigint, instrumentId: bigint) {
    const orders = await this.database
      .select({
        side: investmentOrders.side,
        quantity: investmentOrders.quantity,
        unitPrice: investmentOrders.unitPrice,
        fees: investmentOrders.fees,
      })
      .from(investmentOrders)
      .where(
        and(
          eq(investmentOrders.workspaceId, this.context.workspaceId),
          eq(investmentOrders.investmentAccountId, investmentAccountId),
          eq(investmentOrders.instrumentId, instrumentId),
          isNull(investmentOrders.deletedAt),
        ),
      )
      .orderBy(asc(investmentOrders.tradedOn), asc(investmentOrders.id));
    const position = calculatePosition(orders);
    await this.database
      .insert(positionProjections)
      .values({
        workspaceId: this.context.workspaceId,
        investmentAccountId,
        instrumentId,
        quantity: position.quantity,
        averageCost: position.averageCost,
        totalCost: position.totalCost,
        sourceVersion: orders.length,
        calculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [positionProjections.investmentAccountId, positionProjections.instrumentId],
        set: {
          quantity: position.quantity,
          averageCost: position.averageCost,
          totalCost: position.totalCost,
          sourceVersion: orders.length,
          calculatedAt: new Date(),
        },
      });
    return position;
  }

  private versionConflict(): never {
    throw new ApplicationError("A ordem foi alterada por outra operação.", {
      category: "conflict",
      code: "VERSION_CONFLICT",
    });
  }
}
