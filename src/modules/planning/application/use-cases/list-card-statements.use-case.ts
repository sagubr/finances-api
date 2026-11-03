import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
export class ListCardStatementsUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  execute(context: RequestContext, cardId: string, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, ({ cards }) => cards.listStatements(cardId, query));
  }
}
