import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import type {
  IJobRepository,
  JobRecord,
  ScheduledJob,
} from "#/modules/platform/application/ports/job.repository.js";
import type { IMaintenanceRepository } from "#/modules/platform/application/ports/maintenance.repository.js";
import type { IJobHandler } from "#/worker/application/job-handler.js";
import type {
  IWorkerUnitOfWork,
  WorkerScope,
} from "#/worker/application/ports/worker.unit-of-work.js";
import { CleanExpiredImportFilesUseCase } from "#/worker/application/use-cases/clean-expired-import-files.use-case.js";
import { ProcessNextJobUseCase } from "#/worker/application/use-cases/process-next-job.use-case.js";
import { ScheduleMaintenanceUseCase } from "#/worker/application/use-cases/schedule-maintenance.use-case.js";
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
    expect(schedule.mock.calls[0]?.[0]).toHaveLength(4);
    expect(schedule.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "clean-expired-import-files" })]),
    );
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
