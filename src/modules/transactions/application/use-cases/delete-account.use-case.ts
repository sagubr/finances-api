import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { ITransactionsUnitOfWork } from "../ports/transactions.unit-of-work.js";

export type DeleteAccountCommand = Readonly<{
  context: RequestContext;
  publicId: string;
  expectedVersion: number;
}>;

export class DeleteAccountUseCase {
  constructor(private readonly unitOfWork: ITransactionsUnitOfWork) {}

  async execute({ context, publicId, expectedVersion }: DeleteAccountCommand): Promise<void> {
    requireWorkspaceMutation(context);
    const deleted = await this.unitOfWork.run(
      context,
      async ({ accounts, structureDependencies }) => {
        if (await structureDependencies.hasAccountDependencies(publicId))
          throw new ApplicationError(
            "A conta possui lançamentos pendentes, cartões ou recorrências ativas.",
            { category: "conflict", code: "ACCOUNT_HAS_ACTIVE_DEPENDENCIES" },
          );
        return accounts.softDelete(publicId, expectedVersion);
      },
    );
    if (!deleted)
      throw new ApplicationError("Conta não encontrada ou desatualizada.", {
        category: "conflict",
        code: "VERSION_CONFLICT",
      });
  }
}
