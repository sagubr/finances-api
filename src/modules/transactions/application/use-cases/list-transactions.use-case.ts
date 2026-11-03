import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { ListTransactionsQuery } from "#/modules/transactions/dtos/transaction.dto.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class ListTransactionsUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}
  execute(context: RequestContext, query: ListTransactionsQuery) {
    return this.unitOfWork.run(context, ({ transactions }) => transactions.list(query));
  }
}
