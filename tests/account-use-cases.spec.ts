import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IAccountRepository } from "#/modules/transactions/application/ports/account.repository.js";
import type { ICategoryRepository } from "#/modules/transactions/application/ports/category.repository.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import type { ITransactionRepository } from "#/modules/transactions/application/ports/transaction.repository.js";
import type {
  ITransactionsUnitOfWork,
  TransactionsWorkContext,
} from "#/modules/transactions/application/ports/transactions.unit-of-work.js";
import { CreateAccountUseCase } from "#/modules/transactions/application/use-cases/create-account.use-case.js";
import { DeleteAccountUseCase } from "#/modules/transactions/application/use-cases/delete-account.use-case.js";
import { DeleteCategoryUseCase } from "#/modules/transactions/application/use-cases/delete-category.use-case.js";
import { UpdateAccountUseCase } from "#/modules/transactions/application/use-cases/update-account.use-case.js";
import type { Account } from "#/modules/transactions/domain/account.js";
import type { AccountInput } from "#/modules/transactions/dtos/transaction.dto.js";
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";

const context: RequestContext = {
  userId: 1n,
  userPublicId: "019a4c64-9a81-7000-8000-000000000001",
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: "019a4c64-9a81-7000-8000-000000000002",
  role: "OWNER",
  requestId: "request-1",
};

const input: AccountInput = {
  name: "Conta principal",
  type: "CHECKING",
  currency: "BRL",
  openingBalanceCents: 10_000,
  openingBalanceOn: "2026-11-02",
};

const account: Account = {
  id: "019a4c64-9a81-7000-8000-000000000003",
  ...input,
  currentBalanceCents: input.openingBalanceCents,
  projectedBalanceCents: input.openingBalanceCents,
  active: true,
  version: 1,
};

const createUnitOfWork = (scope: TransactionsWorkContext): ITransactionsUnitOfWork => ({
  run: async <T>(_context: RequestContext, work: (value: TransactionsWorkContext) => Promise<T>) =>
    work(scope),
});

const createRepository = () => {
  const list = vi.fn(() =>
    Promise.resolve({
      items: [] as readonly Account[],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }),
  );
  const create = vi.fn(() => Promise.resolve(account));
  const update = vi.fn(() => Promise.resolve<Account | null>(account));
  const softDelete = vi.fn(() => Promise.resolve(true));
  const repository: IAccountRepository = { list, create, update, softDelete };
  return { repository, create, update, softDelete };
};

const idempotency: IIdempotencyExecutor = {
  execute: async <T>(
    _operation: string,
    _key: string,
    _input: unknown,
    _responseSchema: z.ZodType<T>,
    work: () => Promise<T>,
  ) => work(),
};

const categories: ICategoryRepository = {
  list: () => Promise.resolve({ items: [], pageInfo: { nextCursor: null, hasNextPage: false } }),
  create: () => Promise.resolve(null),
  update: () => Promise.resolve(null),
  deactivate: () => Promise.resolve(false),
};

const createScope = (
  accounts: IAccountRepository,
  dependencies: Partial<TransactionsWorkContext["structureDependencies"]> = {},
): TransactionsWorkContext => ({
  accounts,
  categories,
  idempotency,
  transactions: {} as ITransactionRepository,
  structureDependencies: {
    hasAccountDependencies: () => Promise.resolve(false),
    hasCategoryDependencies: () => Promise.resolve(false),
    ...dependencies,
  },
});

describe("account use cases", () => {
  it("injects the id generator and executes creation through idempotency", async () => {
    const accounts = createRepository();
    const executeIdempotently = vi.spyOn(idempotency, "execute");
    const useCase = new CreateAccountUseCase(
      createUnitOfWork(createScope(accounts.repository)),
      () => account.id,
    );

    const result = await useCase.execute({
      context,
      input,
      idempotencyKey: "idempotency-key-1",
    });

    expect(result).toEqual(account);
    expect(accounts.create).toHaveBeenCalledWith(account.id, context.userId, input);
    expect(executeIdempotently).toHaveBeenCalledWith(
      "CreateAccount",
      "idempotency-key-1",
      input,
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("maps an optimistic concurrency miss to a version conflict", async () => {
    const accounts = createRepository();
    accounts.update.mockResolvedValue(null);
    const useCase = new UpdateAccountUseCase(createUnitOfWork(createScope(accounts.repository)));

    await expect(
      useCase.execute({
        context,
        publicId: account.id,
        input: { name: "Conta atualizada", expectedVersion: 1 },
      }),
    ).rejects.toMatchObject({ category: "conflict", code: "VERSION_CONFLICT" });
  });

  it("rejects mutations from a viewer before opening the unit of work", async () => {
    const accounts = createRepository();
    const unitOfWork = createUnitOfWork(createScope(accounts.repository));
    const run = vi.spyOn(unitOfWork, "run");
    const useCase = new CreateAccountUseCase(unitOfWork, () => account.id);

    await expect(
      useCase.execute({
        context: { ...context, role: "VIEWER" },
        input,
        idempotencyKey: "idempotency-key-1",
      }),
    ).rejects.toMatchObject({ category: "forbidden", code: "CAPABILITY_DENIED" });
    expect(run).not.toHaveBeenCalled();
  });

  it("preserves an account that still has active financial dependencies", async () => {
    const accounts = createRepository();
    const useCase = new DeleteAccountUseCase(
      createUnitOfWork(
        createScope(accounts.repository, {
          hasAccountDependencies: () => Promise.resolve(true),
        }),
      ),
    );

    await expect(
      useCase.execute({ context, publicId: account.id, expectedVersion: 1 }),
    ).rejects.toMatchObject({
      category: "conflict",
      code: "ACCOUNT_HAS_ACTIVE_DEPENDENCIES",
    });
    expect(accounts.softDelete).not.toHaveBeenCalled();
  });

  it("preserves a category that still has an active budget or recurrence", async () => {
    const accounts = createRepository();
    const deactivate = vi.fn(() => Promise.resolve(true));
    const categoryRepository: ICategoryRepository = { ...categories, deactivate };
    const scope = createScope(accounts.repository, {
      hasCategoryDependencies: () => Promise.resolve(true),
    });
    const useCase = new DeleteCategoryUseCase(
      createUnitOfWork({ ...scope, categories: categoryRepository }),
    );

    await expect(useCase.execute(context, account.id, 1)).rejects.toMatchObject({
      category: "conflict",
      code: "CATEGORY_HAS_ACTIVE_DEPENDENCIES",
    });
    expect(deactivate).not.toHaveBeenCalled();
  });
});
