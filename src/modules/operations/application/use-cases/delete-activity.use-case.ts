import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class DeleteActivityUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  execute(context: RequestContext, id: string, expectedVersion: number) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ operations }) =>
      operations.archiveActivity(id, expectedVersion),
    );
  }
}
