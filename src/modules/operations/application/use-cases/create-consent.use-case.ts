import type { ConsentInput } from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IOperationsUnitOfWork } from "../ports/operations.unit-of-work.js";
export class CreateConsentUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, input: ConsentInput) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ operations }) =>
      operations.createConsent(this.generateId(), input, this.now()),
    );
  }
}
