import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export class ListRecurringRulesUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  execute(context: RequestContext, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, ({ recurring }) => recurring.list(query));
  }
}
