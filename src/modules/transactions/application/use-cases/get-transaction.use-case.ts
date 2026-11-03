import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class GetTransactionUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}
  execute(context: RequestContext, publicId: string) {
    return this.unitOfWork.run(context, ({ transactions }) => transactions.find(publicId));
  }
}
