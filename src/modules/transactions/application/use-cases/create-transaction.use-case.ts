import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import {
  transactionSchema,
  type TransactionInput,
} from "#/modules/transactions/dtos/transaction.dto.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class CreateTransactionUseCase {
  constructor(
    private readonly unitOfWork: ITransactionsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: TransactionInput, idempotencyKey: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ transactions, idempotency }) =>
      idempotency.execute("CreateTransaction", idempotencyKey, input, transactionSchema, () =>
        transactions.create(this.generateId(), input),
      ),
    );
  }
}
