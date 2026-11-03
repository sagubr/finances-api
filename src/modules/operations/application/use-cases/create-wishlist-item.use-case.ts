import type { WishlistInput } from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class CreateWishlistItemUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: WishlistInput) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ operations }) =>
      operations.createWishlistItem(this.generateId(), input),
    );
  }
}
