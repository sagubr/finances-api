import type { IInstallmentRepository } from "#/modules/planning/application/ports/installment.repository.js";
import type {
  IPlanningUnitOfWork,
  PlanningWorkContext,
} from "#/modules/planning/application/ports/planning.unit-of-work.js";
import { CreateInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/create-installment-plan.use-case.js";
import { ListInstallmentPlansUseCase } from "#/modules/planning/application/use-cases/list-installment-plans.use-case.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: crypto.randomUUID(),
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: crypto.randomUUID(),
  role: "OWNER",
  requestId: "installment-test",
};

const unitOfWorkWith = (installments: IInstallmentRepository): IPlanningUnitOfWork => ({
  run: <T>(_context: RequestContext, work: (scope: PlanningWorkContext) => Promise<T>) =>
    work({ installments } as PlanningWorkContext),
});

describe("installment use cases", () => {
  it("lists plans through the injected repository", async () => {
    const page = { items: [], pageInfo: { nextCursor: null, hasNextPage: false } };
    const list = vi.fn(() => Promise.resolve(page));
    const repository = { list } as unknown as IInstallmentRepository;
    const useCase = new ListInstallmentPlansUseCase(unitOfWorkWith(repository));

    await expect(useCase.execute(context, { limit: 25 })).resolves.toEqual(page);
    expect(list).toHaveBeenCalledWith({ limit: 25 });
  });

  it("rejects viewer creation before opening a transaction", () => {
    const run = vi.fn();
    const unitOfWork = { run } as unknown as IPlanningUnitOfWork;
    const useCase = new CreateInstallmentPlanUseCase(unitOfWork, () => crypto.randomUUID());

    expect(() =>
      useCase.execute(
        { ...context, role: "VIEWER" },
        {
          accountId: crypto.randomUUID(),
          description: "Notebook",
          totalAmountCents: 300_000,
          installments: 10,
          firstDueOn: "2026-12-10",
          currency: "BRL",
        },
        crypto.randomUUID(),
      ),
    ).toThrowError(expect.objectContaining({ code: "CAPABILITY_DENIED" }));
    expect(run).not.toHaveBeenCalled();
  });
});
