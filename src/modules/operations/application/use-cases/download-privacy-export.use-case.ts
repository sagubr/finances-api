import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import type { IExportStorage } from "#/modules/reports/application/ports/export-storage.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { IContentCipher } from "#/shared/application/ports/content-cipher.js";
import { createHash } from "node:crypto";

export class DownloadPrivacyExportUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly storage: IExportStorage,
    private readonly cipher: IContentCipher,
    private readonly now: () => Date,
  ) {}

  async execute(context: RequestContext, exportId: string, token: string) {
    requireWorkspaceOwner(context);
    const consumedAt = this.now();
    const issuedAt = Number(token.split(".", 1)[0]);
    if (
      !Number.isSafeInteger(issuedAt) ||
      issuedAt > consumedAt.getTime() + 60_000 ||
      consumedAt.getTime() - issuedAt > 5 * 60 * 1_000
    )
      throw this.invalidToken();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const artifact = await this.unitOfWork.run(context, ({ operations }) =>
      operations.findPrivacyDownloadArtifact(exportId, tokenHash, consumedAt),
    );
    if (!artifact) throw this.invalidToken();
    let content: string;
    try {
      const encrypted = await this.storage.read(artifact.storageKey);
      content = this.cipher.decrypt(encrypted);
    } catch {
      throw new ApplicationError(
        "A exportação de privacidade falhou na verificação de integridade.",
        {
          category: "conflict",
          code: "PRIVACY_EXPORT_INTEGRITY_FAILURE",
        },
      );
    }
    const consumed = await this.unitOfWork.run(context, ({ operations }) =>
      operations.consumePrivacyDownloadToken(exportId, tokenHash, consumedAt),
    );
    if (!consumed || consumed.storageKey !== artifact.storageKey) throw this.invalidToken();
    return content;
  }

  private invalidToken(): ApplicationError {
    return new ApplicationError("O token de download é inválido ou expirou.", {
      category: "not-found",
      code: "PRIVACY_EXPORT_DOWNLOAD_NOT_FOUND",
    });
  }
}
