import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  IOperationsUnitOfWork,
  OperationsWorkContext,
} from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { IdempotencyExecutor } from "#/modules/transactions/infrastructure/database/idempotency.executor.js";
import { OperationsRepository } from "./operations.repository.js";
export class OperationsUnitOfWork implements IOperationsUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;
  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }
  run<T>(context: RequestContext, work: (scope: OperationsWorkContext) => Promise<T>): Promise<T> {
    return this.tenantUnitOfWork.run(
      { workspaceId: context.workspaceId, actorId: context.userId },
      (database) =>
        work({
          operations: new OperationsRepository(database, context),
          idempotency: new IdempotencyExecutor(database, context),
        }),
    );
  }
}
