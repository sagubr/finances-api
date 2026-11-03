import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { AssetPatch } from "#/modules/wealth/dtos/wealth.dto.js";
import type { IWealthUnitOfWork } from "../ports/wealth.unit-of-work.js";

export class UpdateAssetUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  execute(context: RequestContext, id: string, input: AssetPatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ wealth }) => wealth.updateAsset(id, input));
  }
}
