import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { AssetValuationInput } from "#/modules/wealth/dtos/wealth.dto.js";
export class CreateAssetValuationUseCase {
  constructor(
    private readonly unitOfWork: IWealthUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, assetId: string, input: AssetValuationInput) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ wealth }) =>
      wealth.createAssetValuation(this.generateId(), assetId, input),
    );
  }
}
