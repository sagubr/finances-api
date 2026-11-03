import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class GetGoalProgressUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, id: string) {
    return this.unitOfWork.run(context, ({ operations }) =>
      operations.getGoalProgress(id, this.now().toISOString()),
    );
  }
}
