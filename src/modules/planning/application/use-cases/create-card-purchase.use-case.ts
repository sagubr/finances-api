import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import {
  cardPurchaseSchema,
  type CardPurchaseInput,
} from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
export class CreateCardPurchaseUseCase {
  constructor(
    private readonly unitOfWork: IPlanningUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  execute(context: RequestContext, cardId: string, input: CardPurchaseInput, key: string) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, ({ cards, idempotency }) =>
      idempotency.execute("CreateCardPurchase", key, input, cardPurchaseSchema, () =>
        cards.createPurchase(
          cardId,
          { statement: this.generateId(), transaction: this.generateId() },
          input,
        ),
      ),
    );
  }
}
