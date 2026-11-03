import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { BudgetPatch } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
export class UpdateBudgetUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  execute(context: RequestContext, id: string, input: BudgetPatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ budgets }) => budgets.update(id, input));
  }
}
