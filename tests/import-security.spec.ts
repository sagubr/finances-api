import type { IImportFileParser } from "#/modules/planning/application/ports/import-file-parser.js";
import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import type { IImportRepository } from "#/modules/planning/application/ports/import.repository.js";
import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import { CreateImportPreviewUseCase } from "#/modules/planning/application/use-cases/create-import-preview.use-case.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { describe, expect, it, vi } from "vitest";

const context: RequestContext = {
  userId: 1n,
  userPublicId: crypto.randomUUID(),
  sessionId: 2n,
  workspaceId: 3n,
  workspacePublicId: crypto.randomUUID(),
  role: "OWNER",
  requestId: "request-1",
};

describe("import storage security", () => {
  it("removes the uploaded file when preview persistence fails", async () => {
    const persistenceError = new Error("preview persistence failed");
    const repository = {
      createPreview: vi.fn(() => Promise.reject(persistenceError)),
    } as unknown as IImportRepository;
    const unitOfWork: IImportUnitOfWork = {
      run: <T>(_context: RequestContext, work: (repository: IImportRepository) => Promise<T>) =>
        work(repository),
    };
    const parser: IImportFileParser = {
      parse: () => [{ raw: { value: "1" }, normalized: {}, errors: [] }],
      normalize: () => ({ raw: {}, normalized: {}, errors: [] }),
    };
    const remove = vi.fn<IImportStorage["remove"]>(() => Promise.resolve());
    const storage: IImportStorage = {
      write: vi.fn(() => Promise.resolve(`${context.workspacePublicId}/batch-id`)),
      remove,
    };
    const useCase = new CreateImportPreviewUseCase(
      unitOfWork,
      parser,
      storage,
      () => "batch-id",
      () => "checksum",
    );

    await expect(
      useCase.execute(context, {
        buffer: Buffer.from("value\n1"),
        fileName: "import.csv",
        mimeType: "text/csv",
      }),
    ).rejects.toBe(persistenceError);
    expect(remove).toHaveBeenCalledWith(`${context.workspacePublicId}/batch-id`);
  });
});
