import {
  wishlistPurchaseSchema,
  type WishlistPurchaseInput,
} from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class PurchaseWishlistItemUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, id: string, input: WishlistPurchaseInput, key: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ operations, idempotency }) =>
      idempotency.execute(
        "PurchaseWishlistItem",
        key,
        { id, ...input },
        wishlistPurchaseSchema,
        () => operations.purchaseWishlistItem(id, this.generateId(), input),
      ),
    );
  }
}
