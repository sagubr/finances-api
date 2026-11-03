import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IAccountRepository } from "#/modules/transactions/application/ports/account.repository.js";
import type { ICategoryRepository } from "#/modules/transactions/application/ports/category.repository.js";
import type { IIdempotencyExecutor } from "#/modules/transactions/application/ports/idempotency.executor.js";
import type {
  ITransactionRepository,
  MonthlyTransactionEntry,
} from "#/modules/transactions/application/ports/transaction.repository.js";
import type {
  ITransactionsUnitOfWork,
  TransactionsWorkContext,
} from "#/modules/transactions/application/ports/transactions.unit-of-work.js";
import { CreateTransactionUseCase } from "#/modules/transactions/application/use-cases/create-transaction.use-case.js";
import { GetMonthlySummaryUseCase } from "#/modules/transactions/application/use-cases/get-monthly-summary.use-case.js";
import { ListTransactionsUseCase } from "#/modules/transactions/application/use-cases/list-transactions.use-case.js";
import { RevertTransactionStatusUseCase } from "#/modules/transactions/application/use-cases/revert-transaction-status.use-case.js";
import type {
  TransactionInput,
  TransactionView,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: "019a4c64-9a81-7000-8000-000000000001",
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: "019a4c64-9a81-7000-8000-000000000002",
  role: "OWNER",
  requestId: "request-1",
};
const input: TransactionInput = {
  accountId: "019a4c64-9a81-7000-8000-000000000003",
  type: "EXPENSE",
  status: "SETTLED",
  amountCents: 1_000,
  currency: "BRL",
  description: "Mercado",
  occurredOn: "2026-11-02",
};
const item: TransactionView = {
  id: "019a4c64-9a81-7000-8000-000000000004",
  ...input,
  competenceMonth: "2026-11",
  categoryId: null,
  settledOn: "2026-11-02",
  sourceModule: null,
  sourcePublicId: null,
  version: 1,
  deletedAt: null,
};

class TestIdempotencyExecutor implements IIdempotencyExecutor {
  readonly calls: Array<readonly [string, string, unknown]> = [];
  async execute<T>(
    operation: string,
    key: string,
    inputValue: unknown,
    _schema: Parameters<IIdempotencyExecutor["execute"]>[3],
    work: () => Promise<T>,
  ): Promise<T> {
    this.calls.push([operation, key, inputValue]);
    return work();
  }
}

const createScope = () => {
  const createTransaction = vi.fn(() => Promise.resolve(item));
  const listTransactions = vi.fn();
  const listMonthlyEntries = vi.fn(() => Promise.resolve<readonly MonthlyTransactionEntry[]>([]));
  const revertStatus = vi.fn();
  const transactions: ITransactionRepository = {
    list: listTransactions,
    find: vi.fn(),
    create: createTransaction,
    update: vi.fn(),
    changeStatus: vi.fn(),
    revertStatus,
    delete: vi.fn(),
    restore: vi.fn(),
    createTransfer: vi.fn(),
    listMonthlyEntries,
  };
  const idempotency = new TestIdempotencyExecutor();
  const scope: TransactionsWorkContext = {
    accounts: {} as IAccountRepository,
    categories: {} as ICategoryRepository,
    transactions,
    idempotency,
    structureDependencies: {
      hasAccountDependencies: () => Promise.resolve(false),
      hasCategoryDependencies: () => Promise.resolve(false),
    },
  };
  return {
    scope,
    createTransaction,
    listTransactions,
    listMonthlyEntries,
    revertStatus,
    idempotency,
  };
};
const unitOfWork = (scope: TransactionsWorkContext): ITransactionsUnitOfWork => ({
  run: async (_context, work) => work(scope),
});

describe("transaction use cases", () => {
  it("creates a transaction through the idempotency boundary", async () => {
    const { scope, createTransaction, idempotency } = createScope();
    const useCase = new CreateTransactionUseCase(unitOfWork(scope), () => item.id);

    await expect(useCase.execute(context, input, "idempotency-key-1")).resolves.toEqual(item);
    expect(idempotency.calls).toEqual([["CreateTransaction", "idempotency-key-1", input]]);
    expect(createTransaction).toHaveBeenCalledWith(item.id, input);
  });

  it("rejects viewer mutations before opening the unit of work", () => {
    const { scope } = createScope();
    const uow = unitOfWork(scope);
    const run = vi.spyOn(uow, "run");
    const useCase = new CreateTransactionUseCase(uow, () => item.id);

    expect(() =>
      useCase.execute({ ...context, role: "VIEWER" }, input, "idempotency-key-1"),
    ).toThrow(expect.objectContaining({ code: "CAPABILITY_DENIED" }));
    expect(run).not.toHaveBeenCalled();
  });

  it("uses the shared monthly semantics and ignores transfers", async () => {
    const { scope, listMonthlyEntries } = createScope();
    listMonthlyEntries.mockResolvedValue([
      { type: "INCOME", status: "SETTLED", amountCents: 5_000n, deleted: false },
      { type: "EXPENSE", status: "SETTLED", amountCents: 1_500n, deleted: false },
      { type: "TRANSFER", status: "SETTLED", amountCents: 9_000n, deleted: false },
    ]);
    const useCase = new GetMonthlySummaryUseCase(unitOfWork(scope));

    await expect(useCase.execute(context, "2026-11")).resolves.toMatchObject({ netCents: 3_500 });
    expect(listMonthlyEntries).toHaveBeenCalledWith("2026-11");
  });

  it("keeps the competence filter when listing transactions", async () => {
    const { scope, listTransactions } = createScope();
    const query = { month: "2026-11", limit: 50 };
    const useCase = new ListTransactionsUseCase(unitOfWork(scope));

    await useCase.execute(context, query);

    expect(listTransactions).toHaveBeenCalledWith(query);
  });

  it("reverts the current transaction status through its explicit boundary", async () => {
    const { scope, revertStatus } = createScope();
    revertStatus.mockResolvedValue({
      ...item,
      status: "CONFIRMED",
      version: 2,
    });
    const useCase = new RevertTransactionStatusUseCase(unitOfWork(scope));

    await expect(useCase.execute(context, item.id, 1)).resolves.toMatchObject({
      status: "CONFIRMED",
    });
    expect(revertStatus).toHaveBeenCalledWith(item.id, 1);
  });
});
