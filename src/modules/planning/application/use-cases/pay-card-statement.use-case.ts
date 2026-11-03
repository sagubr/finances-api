import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import {
  statementPaymentSchema,
  type StatementPaymentInput,
} from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
export class PayCardStatementUseCase {
  constructor(
    private readonly unitOfWork: IPlanningUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, id: string, input: StatementPaymentInput, key: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ cards, idempotency }) =>
      idempotency.execute("PayStatement", key, input, statementPaymentSchema, () =>
        cards.payStatement(
          id,
          { payment: this.generateId(), transaction: this.generateId() },
          input,
        ),
      ),
    );
  }
}
