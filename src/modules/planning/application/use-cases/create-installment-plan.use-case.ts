import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import {
  installmentPlanSchema,
  type InstallmentsInput,
} from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class CreateInstallmentPlanUseCase {
  constructor(
    private readonly unitOfWork: IPlanningUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: InstallmentsInput, idempotencyKey: string) {
    requireWorkspaceMutation(context);
    const planId = this.generateId();
    const transactionIds = Array.from({ length: input.installments }, () => this.generateId());
    const statementIds = Array.from({ length: input.installments }, () => this.generateId());
    return this.unitOfWork.run(context, ({ installments, idempotency }) =>
      idempotency.execute(
        "CreateInstallmentPlan",
        idempotencyKey,
        input,
        installmentPlanSchema,
        () => installments.create(planId, transactionIds, statementIds, input),
      ),
    );
  }
}
