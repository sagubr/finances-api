import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createHash, randomBytes } from "node:crypto";

export class CreateDownloadTokenUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly now: () => Date,
  ) {}
  async execute(context: RequestContext, exportId: string) {
    requireWorkspaceMutation(context);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + 5 * 60 * 1_000);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const created = await this.unitOfWork.run(context, ({ reports }) =>
      reports.createDownloadToken(exportId, tokenHash, expiresAt),
    );
    if (!created)
      throw new ApplicationError("O arquivo ainda não está disponível.", {
        category: "conflict",
        code: "EXPORT_NOT_READY",
      });
    return { token, expiresAt: expiresAt.toISOString() };
  }
}
