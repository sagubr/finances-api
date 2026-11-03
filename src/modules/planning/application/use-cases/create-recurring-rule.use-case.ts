import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import { recurringRuleSchema, type RecurringInput } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class CreateRecurringRuleUseCase {
  constructor(
    private readonly unitOfWork: IPlanningUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: RecurringInput, idempotencyKey: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ recurring, idempotency }) =>
      idempotency.execute("CreateRecurringRule", idempotencyKey, input, recurringRuleSchema, () =>
        recurring.create(this.generateId(), input),
      ),
    );
  }
}
