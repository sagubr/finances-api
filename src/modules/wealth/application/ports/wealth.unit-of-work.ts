import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import type { IWealthRepository } from "./wealth.repository.js";
export type WealthWorkContext = Readonly<{
  wealth: IWealthRepository;
  idempotency: IIdempotencyExecutor;
}>;
export interface IWealthUnitOfWork {
  run<T>(context: RequestContext, work: (scope: WealthWorkContext) => Promise<T>): Promise<T>;
}
