import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class RequestPrivacyExportUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  async execute(context: RequestContext) {
    requireWorkspaceOwner(context);
    const ids = {
      requestId: this.generateId(),
      exportId: this.generateId(),
      jobId: this.generateId(),
    };
    await this.unitOfWork.run(context, ({ operations }) => operations.requestPrivacyExport(ids));
    return { id: ids.exportId, requestId: ids.requestId, status: "REQUESTED" as const };
  }
}
