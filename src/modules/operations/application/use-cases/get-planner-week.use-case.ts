import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class GetPlannerWeekUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, date?: string) {
    const reference = date ?? this.now().toISOString().slice(0, 10);
    return this.unitOfWork.run(context, ({ operations }) => operations.getWeek(reference));
  }
}
