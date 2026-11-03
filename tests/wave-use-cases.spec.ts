import type { IOperationsRepository } from "#/modules/operations/application/ports/operations.repository.js";
import type {
  IOperationsUnitOfWork,
  OperationsWorkContext,
} from "#/modules/operations/application/ports/operations.unit-of-work.js";
import { CancelDeletionUseCase } from "#/modules/operations/application/use-cases/cancel-deletion.use-case.js";
import { GetPrivacyExportUseCase } from "#/modules/operations/application/use-cases/get-privacy-export.use-case.js";
import { ListSensitiveAccessUseCase } from "#/modules/operations/application/use-cases/list-sensitive-access.use-case.js";
import { RequestDeletionUseCase } from "#/modules/operations/application/use-cases/request-deletion.use-case.js";
import { SavePlannerTemplateUseCase } from "#/modules/operations/application/use-cases/save-planner-template.use-case.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IReportRepository } from "#/modules/reports/application/ports/report.repository.js";
import type {
  IReportUnitOfWork,
  ReportWorkContext,
} from "#/modules/reports/application/ports/report.unit-of-work.js";
import { GetAnnualReportUseCase } from "#/modules/reports/application/use-cases/get-annual-report.use-case.js";
import { GetCategorySpendingUseCase } from "#/modules/reports/application/use-cases/get-category-spending.use-case.js";
import type { IWealthRepository } from "#/modules/wealth/application/ports/wealth.repository.js";
import type {
  IWealthUnitOfWork,
  WealthWorkContext,
} from "#/modules/wealth/application/ports/wealth.unit-of-work.js";
import { CalculatePayrollUseCase } from "#/modules/wealth/application/use-cases/calculate-payroll.use-case.js";
import { CreateAssetUseCase } from "#/modules/wealth/application/use-cases/create-asset.use-case.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: "019a4c64-9a81-7000-8000-000000000001",
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: "019a4c64-9a81-7000-8000-000000000002",
  role: "OWNER",
  requestId: "request-wave",
};

describe("wave use-case boundaries", () => {
  it("uses the injected clock for the default annual report year", async () => {
    const annual = vi.fn(() =>
      Promise.resolve({
        year: 2032,
        months: [],
        totals: { incomeCents: 0, expenseCents: 0, netCents: 0 },
        calculatedAt: "2032-04-05T00:00:00.000Z",
        dataVersion: 1,
      }),
    );
    const repository = { annual } as unknown as IReportRepository;
    const unitOfWork: IReportUnitOfWork = {
      run: <T>(_context: RequestContext, work: (scope: ReportWorkContext) => Promise<T>) =>
        work({ reports: repository }),
    };
    const useCase = new GetAnnualReportUseCase(
      unitOfWork,
      () => new Date("2032-04-05T00:00:00.000Z"),
    );

    await useCase.execute(context);

    expect(annual).toHaveBeenCalledWith(2032, "2032-04-05T00:00:00.000Z");
  });

  it("scopes category spending to the requested competence and injected clock", async () => {
    const categorySpending = vi.fn(() =>
      Promise.resolve({
        month: "2032-04",
        items: [],
        totals: { realizedCents: 0, plannedCents: 0, totalCents: 0 },
        calculatedAt: "2032-04-05T00:00:00.000Z",
        dataVersion: 1,
      }),
    );
    const repository = { categorySpending } as unknown as IReportRepository;
    const unitOfWork: IReportUnitOfWork = {
      run: <T>(_context: RequestContext, work: (scope: ReportWorkContext) => Promise<T>) =>
        work({ reports: repository }),
    };
    const useCase = new GetCategorySpendingUseCase(
      unitOfWork,
      () => new Date("2032-04-05T00:00:00.000Z"),
    );

    await useCase.execute(context, "2032-04");

    expect(categorySpending).toHaveBeenCalledWith("2032-04", "2032-04-05T00:00:00.000Z");
  });

  it("rejects overlapping planner slots before opening a transaction", () => {
    const run = vi.fn();
    const unitOfWork: IOperationsUnitOfWork = {
      run: <T>() => {
        run();
        return Promise.reject<T>(new Error("must not run"));
      },
    };
    const useCase = new SavePlannerTemplateUseCase(unitOfWork, () => crypto.randomUUID());

    expect(() =>
      useCase.execute(context, {
        name: "Semana",
        slots: [
          { activityId: crypto.randomUUID(), weekday: 1, startMinute: 480, durationMinutes: 60 },
          { activityId: crypto.randomUUID(), weekday: 1, startMinute: 510, durationMinutes: 30 },
        ],
      }),
    ).toThrow("overlap");
    expect(run).not.toHaveBeenCalled();
  });

  it("requires ownership before scheduling account deletion", async () => {
    const run = vi.fn();
    const unitOfWork: IOperationsUnitOfWork = {
      run: <T>() => {
        run();
        return Promise.reject<T>(new Error("must not run"));
      },
    };
    const useCase = new RequestDeletionUseCase(
      unitOfWork,
      () => crypto.randomUUID(),
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await expect(useCase.execute({ ...context, role: "EDITOR" })).rejects.toMatchObject({
      category: "forbidden",
      code: "CAPABILITY_DENIED",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("requires ownership before cancelling account deletion", async () => {
    const run = vi.fn();
    const unitOfWork: IOperationsUnitOfWork = {
      run: <T>() => {
        run();
        return Promise.reject<T>(new Error("must not run"));
      },
    };
    const useCase = new CancelDeletionUseCase(
      unitOfWork,
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({ ...context, role: "EDITOR" }, crypto.randomUUID()),
    ).rejects.toMatchObject({ category: "forbidden", code: "CAPABILITY_DENIED" });
    expect(run).not.toHaveBeenCalled();
  });

  it("does not expose a privacy export absent from the authenticated subject", async () => {
    const repository = {
      getPrivacyExport: vi.fn(() => Promise.resolve(null)),
    } as unknown as IOperationsRepository;
    const unitOfWork: IOperationsUnitOfWork = {
      run: <T>(_context: RequestContext, work: (scope: OperationsWorkContext) => Promise<T>) =>
        work({ operations: repository, idempotency: {} as OperationsWorkContext["idempotency"] }),
    };
    const useCase = new GetPrivacyExportUseCase(unitOfWork);

    await expect(useCase.execute(context, crypto.randomUUID())).rejects.toMatchObject({
      category: "not-found",
      code: "PRIVACY_EXPORT_NOT_FOUND",
    });
  });

  it("restricts the sensitive-access ledger to the workspace owner", () => {
    const run = vi.fn();
    const unitOfWork: IOperationsUnitOfWork = {
      run: <T>() => {
        run();
        return Promise.reject<T>(new Error("must not run"));
      },
    };
    const useCase = new ListSensitiveAccessUseCase(unitOfWork);

    expect(() => useCase.execute({ ...context, role: "VIEWER" }, { limit: 50 })).toThrowError(
      expect.objectContaining({ category: "forbidden", code: "CAPABILITY_DENIED" }),
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("validates depreciation semantics before persisting an asset", () => {
    const repository = {} as IWealthRepository;
    const run = vi.fn();
    const unitOfWork: IWealthUnitOfWork = {
      run: <T>(_context: RequestContext, work: (scope: WealthWorkContext) => Promise<T>) => {
        run();
        return work({ wealth: repository, idempotency: {} as WealthWorkContext["idempotency"] });
      },
    };
    const useCase = new CreateAssetUseCase(unitOfWork, () => crypto.randomUUID());

    expect(() =>
      useCase.execute(context, {
        name: "Veículo",
        status: "ACTIVE",
        acquisitionCostCents: 100_000,
        currency: "BRL",
        valuationMethod: "LINEAR_DEPRECIATION",
        residualValueCents: 10_000,
      }),
    ).toThrowError(expect.objectContaining({ code: "DEPRECIATION_INPUT_REQUIRED" }));
    expect(run).not.toHaveBeenCalled();
  });

  it("keeps unapproved payroll rules unavailable after capability authorization", () => {
    const useCase = new CalculatePayrollUseCase();
    expect(() => useCase.execute(context)).toThrowError(
      expect.objectContaining({ category: "unavailable", code: "PAYROLL_RULE_SET_UNAVAILABLE" }),
    );
    expect(() => useCase.execute({ ...context, role: "VIEWER" })).toThrowError(
      expect.objectContaining({ category: "forbidden", code: "CAPABILITY_DENIED" }),
    );
  });
});
