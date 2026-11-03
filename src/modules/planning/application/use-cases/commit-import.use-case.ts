import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { CommitImportInput } from "#/modules/planning/dtos/import.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class CommitImportUseCase {
  constructor(
    private readonly unitOfWork: IImportUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, batchId: string, input: CommitImportInput) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, (repository) =>
      repository.commit(batchId, input, this.generateId(), this.generateId),
    );
  }
}
