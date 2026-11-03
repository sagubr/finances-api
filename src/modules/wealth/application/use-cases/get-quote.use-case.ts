import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IWealthUnitOfWork } from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import { ApplicationError } from "#/shared/application/application.error.js";
export class GetQuoteUseCase {
  constructor(private readonly unitOfWork: IWealthUnitOfWork) {}
  async execute(context: RequestContext, id: string) {
    const item = await this.unitOfWork.run(context, ({ wealth }) => wealth.getQuote(id));
    if (!item)
      throw new ApplicationError("Instrumento ou cotação não encontrado.", {
        category: "not-found",
        code: "QUOTE_NOT_FOUND",
      });
    return item;
  }
}
