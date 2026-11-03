import type { ICardRepository } from "#/modules/planning/application/ports/card.repository.js";
import type {
  IPlanningUnitOfWork,
  PlanningWorkContext,
} from "#/modules/planning/application/ports/planning.unit-of-work.js";
import { DeleteCardPurchaseUseCase } from "#/modules/planning/application/use-cases/delete-card-purchase.use-case.js";
import { UpdateCardPurchaseUseCase } from "#/modules/planning/application/use-cases/update-card-purchase.use-case.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: "019a4c64-9a81-7000-8000-000000000001",
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: "019a4c64-9a81-7000-8000-000000000002",
  role: "OWNER",
  requestId: "card-purchase-request",
};
const cardId = "019a4c64-9a81-7000-8000-000000000003";
const purchaseId = "019a4c64-9a81-7000-8000-000000000004";
const categoryId = "019a4c64-9a81-7000-8000-000000000005";
const statementId = "019a4c64-9a81-7000-8000-000000000006";

const createUnitOfWork = (cards: ICardRepository): IPlanningUnitOfWork => ({
  run: <T>(_context: RequestContext, work: (scope: PlanningWorkContext) => Promise<T>) =>
    work({ cards } as PlanningWorkContext),
});

describe("card purchase use cases", () => {
  it("updates a manual purchase through the injected repository", async () => {
    const updatePurchase = vi.fn(() =>
      Promise.resolve({
        id: purchaseId,
        cardId,
        statementId,
        categoryId,
        amountCents: 12_500,
        description: "Mercado corrigido",
        occurredOn: "2026-11-02",
        competenceMonth: "2026-11",
        currency: "BRL",
        status: "CONFIRMED" as const,
        version: 2,
      }),
    );
    const cards = { updatePurchase } as unknown as ICardRepository;
    const useCase = new UpdateCardPurchaseUseCase(createUnitOfWork(cards));
    const input = {
      categoryId,
      amountCents: 12_500,
      description: "Mercado corrigido",
      occurredOn: "2026-11-02",
      expectedVersion: 1,
    };

    await expect(useCase.execute(context, cardId, purchaseId, input)).resolves.toMatchObject({
      id: purchaseId,
      version: 2,
    });
    expect(updatePurchase).toHaveBeenCalledWith(cardId, purchaseId, input);
  });

  it("blocks purchase deletion for a read-only workspace member", () => {
    const deletePurchase = vi.fn(() => Promise.resolve());
    const cards = { deletePurchase } as unknown as ICardRepository;
    const unitOfWork = createUnitOfWork(cards);
    const run = vi.spyOn(unitOfWork, "run");
    const useCase = new DeleteCardPurchaseUseCase(unitOfWork);

    expect(() =>
      useCase.execute({ ...context, role: "VIEWER" }, cardId, purchaseId, 1),
    ).toThrowError(expect.objectContaining({ category: "forbidden", code: "CAPABILITY_DENIED" }));
    expect(run).not.toHaveBeenCalled();
    expect(deletePurchase).not.toHaveBeenCalled();
  });
});
