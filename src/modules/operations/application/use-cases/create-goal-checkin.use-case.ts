import type { GoalCheckinInput } from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class CreateGoalCheckinUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, goalId: string, input: GoalCheckinInput) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ operations }) =>
      operations.createGoalCheckin(this.generateId(), goalId, input),
    );
  }
}
