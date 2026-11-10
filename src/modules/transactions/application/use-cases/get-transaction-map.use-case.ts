import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { ITransactionsUnitOfWork } from "#/modules/transactions/application/ports/transactions.unit-of-work.js";
import type { TransactionMapQuery } from "#/modules/transactions/dtos/transaction.dto.js";

export class GetTransactionMapUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  execute(context: RequestContext, query: TransactionMapQuery) {
    return this.unitOfWork.run(context, ({ transactions }) => transactions.map(query));
  }
}
