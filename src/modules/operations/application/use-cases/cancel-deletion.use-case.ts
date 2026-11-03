import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
export class CancelDeletionUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly now: () => Date,
  ) {}
  async execute(context: RequestContext, id: string) {
    requireWorkspaceOwner(context);
    const cancelledAt = this.now();
    const cancelled = await this.unitOfWork.run(context, ({ operations }) =>
      operations.cancelDeletion(id, cancelledAt),
    );
    if (!cancelled)
      throw new ApplicationError("Solicitação de exclusão não encontrada ou já processada.", {
        category: "conflict",
        code: "DELETION_NOT_CANCELLABLE",
      });
    return { id, status: "CANCELLED" as const, cancelledAt: cancelledAt.toISOString() };
  }
}
