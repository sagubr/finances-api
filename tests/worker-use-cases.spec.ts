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
    expect(schedule.mock.calls[0]?.[0]).toHaveLength(3);
  });
});
