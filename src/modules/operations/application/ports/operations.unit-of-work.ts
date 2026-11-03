import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import type { IOperationsRepository } from "./operations.repository.js";
export type OperationsWorkContext = Readonly<{
  operations: IOperationsRepository;
  idempotency: IIdempotencyExecutor;
}>;
export interface IOperationsUnitOfWork {
  run<T>(context: RequestContext, work: (scope: OperationsWorkContext) => Promise<T>): Promise<T>;
}
