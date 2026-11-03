import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";

export class GetImportBatchUseCase {
  constructor(private readonly unitOfWork: IImportUnitOfWork) {}
  execute(context: RequestContext, publicId: string) {
    return this.unitOfWork.run(context, (repository) => repository.findBatch(publicId));
  }
}
