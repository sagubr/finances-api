import type { IOperationsUnitOfWork } from "#/modules/operations/application/ports/operations.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceOwner } from "#/modules/platform/application/workspace-authorizer.js";
import type { CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
export class ListSensitiveAccessUseCase {
  constructor(private readonly unitOfWork: IOperationsUnitOfWork) {}
  execute(context: RequestContext, query: CursorPaginationQuery) {
    requireWorkspaceOwner(context);
    return this.unitOfWork.run(context, ({ operations }) => operations.listSensitiveAccess(query));
  }
}
