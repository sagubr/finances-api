import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import { budgetCopySchema, type CopyBudgetsInput } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
export class CopyBudgetsUseCase {
  constructor(
    private readonly unitOfWork: IPlanningUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: CopyBudgetsInput, key: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ budgets, idempotency }) =>
      idempotency.execute("CopyBudgets", key, input, budgetCopySchema, () =>
        budgets.copy(input, this.generateId),
      ),
    );
  }
}
