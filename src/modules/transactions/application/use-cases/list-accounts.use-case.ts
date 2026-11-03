import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class ListAccountsUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  async execute(context: RequestContext, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, ({ accounts }) => accounts.list(query));
  }
}
