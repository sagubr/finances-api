import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
import { Decimal } from "decimal.js";
export class ListPositionsUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  async execute(context: RequestContext, query: CursorPaginationQuery) {
    const page = await this.unitOfWork.run(context, ({ wealth }) => wealth.listPositions(query));
    const totals = new Map<
      string,
      {
        invested: Decimal;
        current: Decimal;
        result: Decimal;
        positionCount: number;
        quotedPositions: number;
      }
    >();
    for (const position of page.items) {
      const total = totals.get(position.currency) ?? {
        invested: new Decimal(0),
        current: new Decimal(0),
        result: new Decimal(0),
        positionCount: 0,
        quotedPositions: 0,
      };
      total.invested = total.invested.plus(position.totalCost);
      total.positionCount += 1;
      if (position.currentValue && position.unrealizedResult) {
        total.current = total.current.plus(position.currentValue);
        total.result = total.result.plus(position.unrealizedResult);
        total.quotedPositions += 1;
      }
      totals.set(position.currency, total);
    }
    return {
      ...page,
      summaries: [...totals].map(([currency, total]) => ({
        currency,
        invested: total.invested.toFixed(10),
        current: total.current.toFixed(10),
        result: total.result.toFixed(10),
        positionCount: total.positionCount,
        quotedPositions: total.quotedPositions,
      })),
    };
  }
}
