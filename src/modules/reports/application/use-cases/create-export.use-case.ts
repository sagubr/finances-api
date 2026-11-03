import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import type { IReportUnitOfWork } from "#/modules/reports/application/ports/report.unit-of-work.js";
import type { ExportInput } from "#/modules/reports/dtos/report.dto.js";

export class CreateExportUseCase {
  constructor(
    private readonly unitOfWork: IReportUnitOfWork,
    private readonly generateId: () => string,
  ) {}
  async execute(context: RequestContext, input: ExportInput) {
    requireWorkspaceMutation(context);
    const id = this.generateId();
    await this.unitOfWork.run(context, ({ reports }) =>
      reports.createExport(id, this.generateId(), input),
    );
    return { id, status: "PENDING" as const };
  }
}
