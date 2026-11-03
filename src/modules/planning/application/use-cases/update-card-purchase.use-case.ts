import type { IPlanningUnitOfWork } from "#/modules/planning/application/ports/planning.unit-of-work.js";
import {
  cardPurchaseSchema,
  type CardPurchasePatch,
} from "#/modules/planning/dtos/planning.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class UpdateCardPurchaseUseCase {
  constructor(private readonly unitOfWork: IPlanningUnitOfWork) {}

  execute(context: RequestContext, cardId: string, purchaseId: string, input: CardPurchasePatch) {
    requireWorkspaceMutation(context);
    return this.unitOfWork.run(context, async ({ cards }) =>
      cardPurchaseSchema.parse(await cards.updatePurchase(cardId, purchaseId, input)),
    );
  }
}
