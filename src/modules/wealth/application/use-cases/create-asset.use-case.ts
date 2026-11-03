import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { AssetInput } from "#/modules/wealth/dtos/wealth.dto.js";
import { ApplicationError } from "#/shared/application/application.error.js";
export class CreateAssetUseCase {
  constructor(
    private readonly unitOfWork: IWealthUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: AssetInput) {
    requireWorkspaceMutation(context);
    if (
      input.valuationMethod === "LINEAR_DEPRECIATION" &&
      (!input.usefulLifeMonths || !input.acquiredOn)
    )
      throw new ApplicationError("Informe aquisição e vida útil para depreciação.", {
        category: "validation",
        code: "DEPRECIATION_INPUT_REQUIRED",
      });
    return this.unitOfWork.run(context, ({ wealth }) =>
      wealth.createAsset(this.generateId(), input),
    );
  }
}
