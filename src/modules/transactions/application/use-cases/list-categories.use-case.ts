import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { ITransactionsUnitOfWork } from "#/modules/transactions/application/ports/transactions.unit-of-work.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export class ListCategoriesUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  async execute(context: RequestContext, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, ({ categories }) => categories.list(query));
  }
}
