import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import type { IBudgetRepository } from "./budget.repository.js";
import type { ICardRepository } from "./card.repository.js";
import type { IInstallmentRepository } from "./installment.repository.js";
import type { IRecurringRepository } from "./recurring.repository.js";

export type PlanningWorkContext = Readonly<{
  recurring: IRecurringRepository;
  installments: IInstallmentRepository;
  cards: ICardRepository;
  budgets: IBudgetRepository;
  idempotency: IIdempotencyExecutor;
}>;
export interface IPlanningUnitOfWork {
  run<T>(context: RequestContext, work: (scope: PlanningWorkContext) => Promise<T>): Promise<T>;
}
