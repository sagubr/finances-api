import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { IdempotencyExecutor } from "#/modules/transactions/infrastructure/database/idempotency.executor.js";
import type {
  IWealthUnitOfWork,
  WealthWorkContext,
} from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import { v7 as uuidv7 } from "uuid";
import { WealthRepository } from "./wealth.repository.js";
export class WealthUnitOfWork implements IWealthUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;
  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }
  run<T>(context: RequestContext, work: (scope: WealthWorkContext) => Promise<T>): Promise<T> {
    return this.tenantUnitOfWork.run(
      { workspaceId: context.workspaceId, actorId: context.userId },
      (database) =>
        work({
          wealth: new WealthRepository(database, context, uuidv7),
          idempotency: new IdempotencyExecutor(database, context),
        }),
    );
  }
}
