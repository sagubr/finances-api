import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IExportStorage } from "#/modules/reports/application/ports/export-storage.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createHash } from "node:crypto";

export class DownloadExportUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly storage: IExportStorage,
    private readonly now: () => Date,
  ) {}

  async execute(context: RequestContext, exportId: string, token: string) {
    requireWorkspaceMutation(context);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const consumedAt = this.now();
    const artifact = await this.unitOfWork.run(context, ({ reports }) =>
      reports.findDownloadArtifact(exportId, tokenHash, consumedAt),
    );
    if (!artifact)
      throw new ApplicationError("O token de download é inválido ou expirou.", {
        category: "not-found",
        code: "EXPORT_DOWNLOAD_NOT_FOUND",
      });
    let content: string;
    try {
      content = await this.storage.read(artifact.storageKey);
    } catch {
      throw new ApplicationError("O arquivo exportado não está disponível no armazenamento.", {
        category: "conflict",
        code: "EXPORT_STORAGE_FAILURE",
      });
    }
    const checksum = createHash("sha256").update(content).digest("hex");
    if (checksum !== artifact.checksum)
      throw new ApplicationError("O arquivo exportado não passou na verificação de integridade.", {
        category: "conflict",
        code: "EXPORT_INTEGRITY_FAILURE",
      });
    const consumed = await this.unitOfWork.run(context, ({ reports }) =>
      reports.consumeDownloadToken(exportId, tokenHash, consumedAt),
    );
    if (!consumed || consumed.storageKey !== artifact.storageKey)
      throw new ApplicationError("O token de download é inválido ou expirou.", {
        category: "not-found",
        code: "EXPORT_DOWNLOAD_NOT_FOUND",
      });
    return {
      content,
      contentType:
        artifact.format === "CSV" ? "text/csv; charset=utf-8" : "application/octet-stream",
      fileName: `finances-${exportId}.${artifact.format.toLowerCase()}`,
    };
  }
}
