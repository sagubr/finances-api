import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { OrderInput } from "#/modules/wealth/dtos/wealth.dto.js";
import { orderSchema } from "#/modules/wealth/dtos/wealth.dto.js";
export class CreateOrderUseCase {
  constructor(
    private readonly unitOfWork: IWealthUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, input: OrderInput, idempotencyKey: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ wealth, idempotency }) =>
      idempotency.execute("RecordOrder", idempotencyKey, input, orderSchema, () =>
        wealth.createOrder(this.generateId(), input),
      ),
    );
  }
}
