import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { ITransactionsUnitOfWork } from "#/modules/transactions/application/ports/transactions.unit-of-work.js";
import type { Category } from "#/modules/transactions/domain/category.js";
import { categorySchema, type CategoryInput } from "#/modules/transactions/dtos/transaction.dto.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export type CreateCategoryCommand = Readonly<{
  context: RequestContext;
  input: CategoryInput;
  idempotencyKey: string;
}>;

export class CreateCategoryUseCase {
  constructor(
    private readonly unitOfWork: ITransactionsUnitOfWork,
    private readonly generateId: () => string,
  ) {}

  async execute({ context, input, idempotencyKey }: CreateCategoryCommand): Promise<Category> {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ categories, idempotency }) =>
      idempotency.execute("CreateCategory", idempotencyKey, input, categorySchema, async () => {
        const category = await categories.create(this.generateId(), input);
        if (category) return category;
        throw new ApplicationError("O grupo de categoria informado é inválido.", {
          category: "validation",
          code: "CATEGORY_GROUP_INVALID",
        });
      }),
    );
  }
}
