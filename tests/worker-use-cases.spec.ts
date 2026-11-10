import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import type {
  IJobRepository,
  JobRecord,
  ScheduledJob,
} from "#/modules/platform/application/ports/job.repository.js";
import type { IMaintenanceRepository } from "#/modules/platform/application/ports/maintenance.repository.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type {
  IWorkerUnitOfWork,
  WorkerScope,
} from "#/worker/application/ports/worker.unit-of-work.js";
import { CleanExpiredImportFilesUseCase } from "#/worker/application/use-cases/clean-expired-import-files.use-case.js";
import { ProcessNextJobUseCase } from "#/worker/application/use-cases/process-next-job.use-case.js";
import { ScheduleMaintenanceUseCase } from "#/worker/application/use-cases/schedule-maintenance.use-case.js";
import { SettleOverdueTransactionsUseCase } from "#/worker/application/use-cases/settle-overdue-transactions.use-case.js";
import { describe, expect, it, vi } from "vitest";

const job: JobRecord = {
  id: 1n,
  publicId: crypto.randomUUID(),
  workspaceId: 2n,
  name: "example",
  payload: {},
  attempts: 1,
};

describe("worker use cases", () => {
  it("completes a claimed job after its handler commits", async () => {
    const repository = {
      claim: vi.fn(() => Promise.resolve(job)),
      complete: vi.fn(() => Promise.resolve()),
      fail: vi.fn(() => Promise.resolve()),
    } satisfies IJobRepository;
    const handler = {
      name: "example",
      execute: vi.fn(() => Promise.resolve()),
    } satisfies IJobHandler;

    await expect(new ProcessNextJobUseCase(repository, [handler]).execute()).resolves.toBe(true);
    expect(handler.execute).toHaveBeenCalledWith(job);
    expect(repository.complete).toHaveBeenCalledWith(job.id);
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("records retry state when a job handler fails", async () => {
    const repository = {
      claim: vi.fn(() => Promise.resolve(job)),
      complete: vi.fn(() => Promise.resolve()),
      fail: vi.fn(() => Promise.resolve()),
    } satisfies IJobRepository;
    const handler = {
      name: "example",
      execute: vi.fn(() => Promise.reject(new TypeError("failure"))),
    } satisfies IJobHandler;

    await expect(new ProcessNextJobUseCase(repository, [handler]).execute()).rejects.toThrow(
      "failure",
    );
    expect(repository.fail).toHaveBeenCalledWith(job.id, job.attempts, "TypeError");
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it("records the application error code for actionable job diagnostics", async () => {
    const repository = {
      claim: vi.fn(() => Promise.resolve(job)),
      complete: vi.fn(() => Promise.resolve()),
      fail: vi.fn(() => Promise.resolve()),
    } satisfies IJobRepository;
    const handler = {
      name: "example",
      execute: vi.fn(() =>
        Promise.reject(
          new ApplicationError("Closed statement", {
            category: "conflict",
            code: "RECURRENCE_STATEMENT_IMMUTABLE",
          }),
        ),
      ),
    } satisfies IJobHandler;

    await expect(new ProcessNextJobUseCase(repository, [handler]).execute()).rejects.toThrow(
      "Closed statement",
    );
    expect(repository.fail).toHaveBeenCalledWith(
      job.id,
      job.attempts,
      "RECURRENCE_STATEMENT_IMMUTABLE",
    );
  });

  it("schedules maintenance through the tenant unit of work", async () => {
    const schedule = vi.fn<(jobs: readonly ScheduledJob[]) => Promise<void>>(() =>
      Promise.resolve(),
    );
    const maintenance: IMaintenanceRepository = {
      listWorkspaces: () => Promise.resolve([{ id: 7n, timezone: "America/Sao_Paulo" }]),
    };
    const unitOfWork: IWorkerUnitOfWork = {
      run: <T>(_workspaceId: bigint, work: (scope: WorkerScope) => Promise<T>) =>
        work({
          planning: {
            listActiveRuleIds: () => Promise.resolve([crypto.randomUUID()]),
          } as unknown as WorkerScope["planning"],
          transactions: {
            settleOverdue: vi.fn(() => Promise.resolve({ confirmed: 0, settled: 0 })),
          },
          scheduledJobs: { schedule },
        }),
    };
    const useCase = new ScheduleMaintenanceUseCase(
      maintenance,
      unitOfWork,
      () => crypto.randomUUID(),
      () => new Date("2026-11-02T15:00:00.000Z"),
    );

    await useCase.execute();

    expect(schedule).toHaveBeenCalledOnce();
    expect(schedule.mock.calls[0]?.[0]).toHaveLength(5);
    expect(schedule.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "clean-expired-import-files" }),
        expect.objectContaining({
          name: "settle-overdue-transactions",
          payload: { referenceOn: "2026-11-02" },
        }),
      ]),
    );
  });

  it("settles overdue transactions using the workspace civil date", async () => {
    const settleOverdue = vi.fn(() => Promise.resolve({ confirmed: 2, settled: 3 }));
    const unitOfWork: IWorkerUnitOfWork = {
      run: <T>(_workspaceId: bigint, work: (scope: WorkerScope) => Promise<T>) =>
        work({
          planning: {} as WorkerScope["planning"],
          transactions: { settleOverdue },
          scheduledJobs: { schedule: vi.fn() },
        }),
    };

    await new SettleOverdueTransactionsUseCase(unitOfWork).execute({
      ...job,
      name: "settle-overdue-transactions",
      payload: { referenceOn: "2026-11-02" },
    });

    expect(settleOverdue).toHaveBeenCalledWith("2026-11-02");
  });

  it("removes expired import files and marks their storage keys as collected", async () => {
    const remove = vi.fn<IImportStorage["remove"]>(() => Promise.resolve());
    const markImportFileRemoved = vi.fn<(id: bigint) => Promise<void>>(() => Promise.resolve());
    const unitOfWork: IWorkerUnitOfWork = {
      run: <T>(_workspaceId: bigint, work: (scope: WorkerScope) => Promise<T>) =>
        work({
          planning: {
            listExpiredImportFiles: () =>
              Promise.resolve([{ id: 9n, storageKey: "workspace/import-file" }]),
            markImportFileRemoved,
          } as unknown as WorkerScope["planning"],
          transactions: {
            settleOverdue: vi.fn(() => Promise.resolve({ confirmed: 0, settled: 0 })),
          },
          scheduledJobs: { schedule: vi.fn() },
        }),
    };
    const storage: IImportStorage = { write: vi.fn(), remove };
    const useCase = new CleanExpiredImportFilesUseCase(
      unitOfWork,
      storage,
      () => new Date("2026-11-02T15:00:00.000Z"),
    );

    await useCase.execute({ ...job, name: "clean-expired-import-files" });

    expect(remove).toHaveBeenCalledWith("workspace/import-file");
    expect(markImportFileRemoved).toHaveBeenCalledWith(9n);
  });
});
