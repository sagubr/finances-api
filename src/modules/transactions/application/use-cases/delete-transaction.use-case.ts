import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class DeleteTransactionUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}
  execute(context: RequestContext, publicId: string, expectedVersion: number) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ transactions }) =>
      transactions.delete(publicId, expectedVersion),
    );
  }
}
