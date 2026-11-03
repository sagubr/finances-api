import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class ReadNotificationUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  async execute(context: RequestContext, id: string) {
    requireWorkspaceMutation(context);
    await this.unitOfWork.run(context, ({ operations }) => operations.readNotification(id));
    return { id, read: true as const };
  }
}
