import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import { transferSchema, type TransferInput } from "#/modules/transactions/dtos/transaction.dto.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export class CreateTransferUseCase {
  constructor(
    private readonly unitOfWork: ITransactionsUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: TransferInput, idempotencyKey: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ transactions, idempotency }) =>
      idempotency.execute("CreateTransfer", idempotencyKey, input, transferSchema, () =>
        transactions.createTransfer(
          { pair: this.generateId(), debit: this.generateId(), credit: this.generateId() },
          input,
        ),
      ),
    );
  }
}
