import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { AccountInput } from "#/modules/transactions/dtos/transaction.dto.js";
import { accountSchema } from "#/modules/transactions/dtos/transaction.dto.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export type CreateAccountCommand = Readonly<{
  context: RequestContext;
  input: AccountInput;
  idempotencyKey: string;
}>;

export class CreateAccountUseCase {
  constructor(
    private readonly unitOfWork: ITransactionsUnitOfWork,
    private readonly generateId: () => string,
  ) {}

  async execute({ context, input, idempotencyKey }: CreateAccountCommand) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ accounts, idempotency }) =>
      idempotency.execute("CreateAccount", idempotencyKey, input, accountSchema, () =>
        accounts.create(this.generateId(), context.userId, input),
      ),
    );
  }
}
