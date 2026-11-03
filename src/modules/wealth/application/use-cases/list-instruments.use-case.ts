import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import type { InstrumentQuery } from "#/modules/wealth/dtos/wealth.dto.js";
export class ListInstrumentsUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  execute(context: RequestContext, query: InstrumentQuery) {
    return this.unitOfWork.run(context, ({ wealth }) => wealth.listInstruments(query));
  }
}
