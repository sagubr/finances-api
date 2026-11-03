import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class DeleteCategoryUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  async execute(context: RequestContext, publicId: string, expectedVersion: number) {
    requireWorkspaceMutation(context);
    const deleted = await this.unitOfWork.run(
      context,
      async ({ categories, structureDependencies }) => {
        if (await structureDependencies.hasCategoryDependencies(publicId))
          throw new ApplicationError("A categoria possui orçamento ou recorrência ativa.", {
            category: "conflict",
            code: "CATEGORY_HAS_ACTIVE_DEPENDENCIES",
          });
        return categories.deactivate(publicId, expectedVersion);
      },
    );
    if (!deleted)
      throw new ApplicationError("Categoria não encontrada, padrão ou desatualizada.", {
        category: "conflict",
        code: "VERSION_CONFLICT",
      });
  }
}
