import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { TransactionPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class UpdateTransactionUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}
  execute(context: RequestContext, publicId: string, input: TransactionPatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ transactions }) => transactions.update(publicId, input));
  }
}
