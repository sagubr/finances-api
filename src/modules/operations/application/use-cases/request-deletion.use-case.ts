import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class RequestDeletionUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}
  async execute(context: RequestContext) {
    requireWorkspaceOwner(context);
    const ids = { requestId: this.generateId(), deletionId: this.generateId() };
    const executeAfter = new Date(this.now().getTime() + 7 * 24 * 60 * 60 * 1_000);
    await this.unitOfWork.run(context, ({ operations }) =>
      operations.requestDeletion(ids, executeAfter),
    );
    return {
      id: ids.deletionId,
      requestId: ids.requestId,
      status: "REQUESTED" as const,
      executeAfter: executeAfter.toISOString(),
    };
  }
}
