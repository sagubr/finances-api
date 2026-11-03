import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type {
  ITransactionsUnitOfWork,
  TransactionsWorkContext,
} from "#/modules/transactions/application/ports/transactions.unit-of-work.js";
import { v7 as uuidv7 } from "uuid";
import { AccountRepository } from "./account.repository.js";
import { CategoryRepository } from "./category.repository.js";
import { IdempotencyExecutor } from "./idempotency.executor.js";
import { StructureDependencyRepository } from "./structure-dependency.repository.js";
import { TransactionRepository } from "./transaction.repository.js";

export class TransactionsUnitOfWork implements ITransactionsUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;

  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }

  async run<T>(
    context: RequestContext,
    work: (scope: TransactionsWorkContext) => Promise<T>,
  ): Promise<T> {
    return this.tenantUnitOfWork.run(
      { workspaceId: context.workspaceId, actorId: context.userId },
      async (database) => {
        return work({
          accounts: new AccountRepository(database, context.workspaceId),
          categories: new CategoryRepository(database, context.workspaceId),
          idempotency: new IdempotencyExecutor(database, context),
          transactions: new TransactionRepository(database, context, uuidv7),
          structureDependencies: new StructureDependencyRepository(database, context.workspaceId),
        });
      },
    );
  }
}
