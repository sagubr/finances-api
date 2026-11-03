import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  IPlanningUnitOfWork,
  PlanningWorkContext,
} from "#/modules/planning/application/ports/planning.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { IdempotencyExecutor } from "#/modules/transactions/infrastructure/database/idempotency.executor.js";
import { v7 as uuidv7 } from "uuid";
import { BudgetRepository } from "./budget.repository.js";
import { CardRepository } from "./card.repository.js";
import { InstallmentRepository } from "./installment.repository.js";
import { RecurringRepository } from "./recurring.repository.js";

export class PlanningUnitOfWork implements IPlanningUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;
  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }
  run<T>(context: RequestContext, work: (scope: PlanningWorkContext) => Promise<T>): Promise<T> {
    return this.tenantUnitOfWork.run(
      { workspaceId: context.workspaceId, actorId: context.userId },
      (database) =>
        work({
          recurring: new RecurringRepository(database, context, uuidv7),
          installments: new InstallmentRepository(database, context, uuidv7),
          cards: new CardRepository(database, context, uuidv7),
          budgets: new BudgetRepository(database, context),
          idempotency: new IdempotencyExecutor(database, context),
        }),
    );
  }
}
