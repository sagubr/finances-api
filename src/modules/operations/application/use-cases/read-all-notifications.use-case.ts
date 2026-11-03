import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class ReadAllNotificationsUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  async execute(context: RequestContext) {
    requireWorkspaceMutation(context);
    const updated = await this.unitOfWork.run(context, ({ operations }) =>
      operations.readAllNotifications(),
    );
    return { updated };
  }
}
