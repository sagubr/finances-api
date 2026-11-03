import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class RollbackImportUseCase {
  constructor(private readonly unitOfWork: IImportUnitOfWork) {}
  async execute(context: RequestContext, batchId: string) {
    requireWorkspaceMutation(context);
    const rolledBackCount = await this.unitOfWork.run(context, (repository) =>
      repository.rollback(batchId),
    );
    return { id: batchId, status: "ROLLED_BACK" as const, rolledBackCount };
  }
}
