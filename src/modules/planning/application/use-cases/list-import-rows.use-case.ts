import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export class ListImportRowsUseCase {
  constructor(private readonly unitOfWork: IImportUnitOfWork) {}
  execute(context: RequestContext, batchId: string, query: CursorPaginationQuery) {
    return this.unitOfWork.run(context, (repository) => repository.listRows(batchId, query));
  }
}
