import type { IImportFileParser } from "#/modules/planning/application/ports/import-file-parser.js";
import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { ImportRowCorrection } from "#/modules/planning/dtos/import.dto.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";

export class UpdateImportRowUseCase {
  constructor(
    private readonly unitOfWork: IImportUnitOfWork,
    private readonly parser: IImportFileParser,
  ) {}
  execute(context: RequestContext, batchId: string, rowId: string, input: ImportRowCorrection) {
    requireWorkspaceMutation(context);
    const row = this.parser.normalize(input);
    return this.unitOfWork.run(context, (repository) => repository.updateRow(batchId, rowId, row));
  }
}
