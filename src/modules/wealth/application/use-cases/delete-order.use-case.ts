import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
export class DeleteOrderUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  async execute(context: RequestContext, id: string, expectedVersion: number) {
    requireWorkspaceMutation(context);
    await this.unitOfWork.run(context, ({ wealth }) => wealth.deleteOrder(id, expectedVersion));
  }
}
