import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { GoalPatch } from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class UpdateGoalUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  execute(context: RequestContext, id: string, input: GoalPatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ operations }) => operations.updateGoal(id, input));
  }
}
