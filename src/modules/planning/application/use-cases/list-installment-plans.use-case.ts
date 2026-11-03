import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { InstallmentQuery } from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";

export class ListInstallmentPlansUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}

  execute(context: RequestContext, query: InstallmentQuery) {
    return this.unitOfWork.run(context, ({ installments }) => installments.list(query));
  }
}
