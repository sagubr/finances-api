import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { RecurringPatch } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class UpdateRecurringRuleUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}
  execute(context: RequestContext, id: string, input: RecurringPatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ recurring }) => recurring.update(id, input));
  }
}
