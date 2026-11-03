import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
export class DeleteBudgetUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  execute(context: RequestContext, id: string, version: number) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ budgets }) => budgets.delete(id, version));
  }
}
