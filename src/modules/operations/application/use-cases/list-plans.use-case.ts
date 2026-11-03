import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
export class ListPlansUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  execute(context: RequestContext) {
    return this.unitOfWork.run(context, ({ operations }) => operations.listPlans());
  }
}
