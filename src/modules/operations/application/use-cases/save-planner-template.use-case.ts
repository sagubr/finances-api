import { assertNonOverlappingSlots } from "#/modules/operations/domain/planner.js";
import type { SlotsInput } from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class SavePlannerTemplateUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: SlotsInput) {
    requireWorkspaceMutation(context);
    assertNonOverlappingSlots(input.slots);
    return this.unitOfWork.run(context, ({ operations }) =>
      operations.saveTemplate(input.templateId ?? this.generateId(), input, this.generateId),
    );
  }
}
