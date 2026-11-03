import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
export class GetNetWorthUseCase {
  constructor(
    private readonly unitOfWork: IWealthUnitOfWork,
    private readonly now: () => Date,
  ) {}
  execute(context: RequestContext, date?: string) {
    const instant = this.now();
    const referenceOn = date ?? instant.toISOString().slice(0, 10);
    return this.unitOfWork.run(context, ({ wealth }) =>
      wealth.getNetWorth(referenceOn, instant.toISOString()),
    );
  }
}
