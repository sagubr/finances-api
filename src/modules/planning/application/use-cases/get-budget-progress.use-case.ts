import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { BudgetProgressQuery } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
export class GetBudgetProgressUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  async execute(context: RequestContext, query: BudgetProgressQuery) {
    const page = await this.unitOfWork.run(context, ({ budgets }) => budgets.progress(query));
    return {
      month: query.month,
      items: [...page.items],
      pageInfo: page.pageInfo,
    };
  }
}
