import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { BudgetQuery } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
export class ListBudgetsUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  execute(context: RequestContext, query: BudgetQuery) {
    return this.unitOfWork.run(context, ({ budgets }) => budgets.list(query));
  }
}
