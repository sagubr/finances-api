import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
export class ListOrdersUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  execute(context: RequestContext, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, ({ wealth }) => wealth.listOrders(query));
  }
}
