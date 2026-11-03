import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { CategoryPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class UpdateCategoryUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  async execute(context: RequestContext, publicId: string, input: CategoryPatch) {
    requireWorkspaceMutation(context);
    const category = await this.unitOfWork.run(context, ({ categories }) =>
      categories.update(publicId, input),
    );
    if (!category)
      throw new ApplicationError("Categoria não encontrada, padrão ou desatualizada.", {
        category: "conflict",
        code: "VERSION_CONFLICT",
      });
    return category;
  }
}
