import type { WishlistListQuery } from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class ListWishlistUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  execute(context: RequestContext, query: WishlistListQuery) {
    return this.unitOfWork.run(context, ({ operations }) => operations.listWishlist(query));
  }
}
