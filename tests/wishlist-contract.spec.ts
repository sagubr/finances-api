import type { IOperationsRepository } from "#/modules/operations/application/ports/operations.repository.js";
import type {
  IOperationsUnitOfWork,
  OperationsWorkContext,
} from "#/modules/operations/application/ports/operations.unit-of-work.js";
import { GetWishlistSummaryUseCase } from "#/modules/operations/application/use-cases/get-wishlist-summary.use-case.js";
import { PurchaseWishlistItemUseCase } from "#/modules/operations/application/use-cases/purchase-wishlist-item.use-case.js";
import {
  wishlistListQuerySchema,
  wishlistPurchaseInputSchema,
  wishlistSummarySchema,
} from "#/modules/operations/dtos/operations.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: crypto.randomUUID(),
  sessionId: 1n,
  workspaceId: 2n,
  workspacePublicId: crypto.randomUUID(),
  role: "EDITOR",
  requestId: crypto.randomUUID(),
};

const unitOfWork = (scope: OperationsWorkContext): IOperationsUnitOfWork => ({
  run: (_context, work) => work(scope),
});

describe("wishlist contract", () => {
  it("accepts filters and validates optional transaction fields", () => {
    expect(
      wishlistListQuerySchema.parse({
        status: "PURCHASED",
        from: "2026-11-01",
        to: "2026-11-30",
        priority: "3",
      }),
    ).toMatchObject({
      status: "PURCHASED",
      from: "2026-11-01",
      to: "2026-11-30",
      priority: 3,
    });
    expect(
      wishlistPurchaseInputSchema.safeParse({
        expectedVersion: 1,
        createTransaction: false,
        amountCents: 12_000,
        purchasedOn: "2026-11-10",
      }).success,
    ).toBe(true);
    expect(
      wishlistPurchaseInputSchema.safeParse({
        expectedVersion: 1,
        createTransaction: true,
        amountCents: 12_000,
        purchasedOn: "2026-11-10",
      }).success,
    ).toBe(false);
  });

  it("keeps summary totals separated by currency", () => {
    expect(
      wishlistSummarySchema.parse({
        month: "2026-11",
        totals: [
          { currency: "BRL", totalCents: 10_000, itemCount: 2 },
          { currency: "USD", totalCents: 2_000, itemCount: 1 },
        ],
      }).totals,
    ).toHaveLength(2);
  });

  it("runs purchase through the idempotency executor", async () => {
    const purchaseWishlistItem = vi.fn().mockResolvedValue({
      itemId: crypto.randomUUID(),
      transactionId: null,
      repeated: false,
    });
    const repository = { purchaseWishlistItem } as unknown as IOperationsRepository;
    const execute = vi.fn();
    const idempotency: IIdempotencyExecutor = {
      execute: (operation, key, input, schema, work) => {
        execute(operation, key, input, schema, work);
        return work();
      },
    };
    const useCase = new PurchaseWishlistItemUseCase(
      unitOfWork({ operations: repository, idempotency }),
      () => crypto.randomUUID(),
    );
    const itemId = crypto.randomUUID();
    const input = {
      expectedVersion: 1,
      createTransaction: false,
      amountCents: 25_000,
      purchasedOn: "2026-11-10",
    } as const;

    await useCase.execute(context, itemId, input, "wishlist-purchase-key");

    expect(execute).toHaveBeenCalledWith(
      "PurchaseWishlistItem",
      "wishlist-purchase-key",
      { id: itemId, ...input },
      expect.anything(),
      expect.any(Function),
    );
    expect(purchaseWishlistItem).toHaveBeenCalledOnce();
  });

  it("delegates monthly summary to the repository", async () => {
    const getWishlistSummary = vi.fn().mockResolvedValue({ month: "2026-11", totals: [] });
    const repository = { getWishlistSummary } as unknown as IOperationsRepository;
    const idempotency = {} as IIdempotencyExecutor;
    const useCase = new GetWishlistSummaryUseCase(
      unitOfWork({ operations: repository, idempotency }),
    );

    await useCase.execute(context, "2026-11");

    expect(getWishlistSummary).toHaveBeenCalledWith("2026-11");
  });
});
