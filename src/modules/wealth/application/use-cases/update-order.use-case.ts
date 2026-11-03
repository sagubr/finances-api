import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { OrderPatch } from "#/modules/wealth/dtos/wealth.dto.js";
export class UpdateOrderUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  execute(context: RequestContext, id: string, input: OrderPatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ wealth }) => wealth.updateOrder(id, input));
  }
}
