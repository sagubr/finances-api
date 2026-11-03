import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
export class GetPrivacyExportUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  async execute(context: RequestContext, id: string) {
    requireWorkspaceOwner(context);
    const item = await this.unitOfWork.run(context, ({ operations }) =>
      operations.getPrivacyExport(id),
    );
    if (!item)
      throw new ApplicationError("Export de privacidade não encontrado.", {
        category: "not-found",
        code: "PRIVACY_EXPORT_NOT_FOUND",
      });
    return item;
  }
}
