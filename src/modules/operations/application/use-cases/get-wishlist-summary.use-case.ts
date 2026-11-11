import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";

export class GetWishlistSummaryUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}

  execute(context: RequestContext, month: string) {
    return this.unitOfWork.run(context, ({ operations }) => operations.getWishlistSummary(month));
  }
}
