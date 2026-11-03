import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createHash, randomBytes } from "node:crypto";

export class CreatePrivacyDownloadTokenUseCase {
  constructor(
    private readonly unitOfWork: IOperationsUnitOfWork,
    private readonly now: () => Date,
  ) {}

  async execute(context: RequestContext, exportId: string) {
    requireWorkspaceOwner(context);
    const issuedAt = this.now();
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1_000);
    const token = `${issuedAt.getTime()}.${randomBytes(32).toString("base64url")}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const created = await this.unitOfWork.run(context, ({ operations }) =>
      operations.createPrivacyDownloadToken(exportId, tokenHash, issuedAt),
    );
    if (!created)
      throw new ApplicationError("A exportação de privacidade ainda não está disponível.", {
        category: "conflict",
        code: "PRIVACY_EXPORT_NOT_READY",
      });
    return { token, expiresAt: expiresAt.toISOString() };
  }
}
