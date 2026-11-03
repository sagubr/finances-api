import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IAccountRepository } from "./account.repository.js";
import type { ICategoryRepository } from "./category.repository.js";
import type { IIdempotencyExecutor } from "./idempotency.executor.js";
import type { IStructureDependencyRepository } from "./structure-dependency.repository.js";
import type { ITransactionRepository } from "./transaction.repository.js";

export type TransactionsWorkContext = Readonly<{
  accounts: IAccountRepository;
  categories: ICategoryRepository;
  idempotency: IIdempotencyExecutor;
  transactions: ITransactionRepository;
  structureDependencies: IStructureDependencyRepository;
}>;

export interface ITransactionsUnitOfWork {
  run<T>(context: RequestContext, work: (scope: TransactionsWorkContext) => Promise<T>): Promise<T>;
}
