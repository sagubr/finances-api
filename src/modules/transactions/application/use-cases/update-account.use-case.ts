import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { Account } from "#/modules/transactions/domain/account.js";
import type { AccountPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export type UpdateAccountCommand = Readonly<{
  context: RequestContext;
  publicId: string;
  input: AccountPatch;
}>;

export class UpdateAccountUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  async execute({ context, publicId, input }: UpdateAccountCommand): Promise<Account> {
    requireWorkspaceMutation(context);
    const account = await this.unitOfWork.run(context, ({ accounts }) =>
      accounts.update(publicId, context.userId, input),
    );
    if (!account)
      throw new ApplicationError("Conta não encontrada ou desatualizada.", {
        category: "conflict",
        code: "VERSION_CONFLICT",
      });
    return account;
  }
}
