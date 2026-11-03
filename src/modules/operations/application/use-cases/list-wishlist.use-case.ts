import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class ListWishlistUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  execute(context: RequestContext, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, ({ operations }) => operations.listWishlist(query));
  }
}
