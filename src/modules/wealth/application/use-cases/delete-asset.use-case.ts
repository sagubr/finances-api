import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IWealthUnitOfWork } from "../ports/wealth.unit-of-work.js";

export class DeleteAssetUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  execute(context: RequestContext, id: string, expectedVersion: number) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ wealth }) => wealth.archiveAsset(id, expectedVersion));
  }
}
