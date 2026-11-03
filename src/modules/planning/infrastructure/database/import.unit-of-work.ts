import type { Database } from "#/infrastructure/database/db.provider.js";
import { TenantUnitOfWork } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IImportRepository } from "#/modules/planning/application/ports/import.repository.js";
import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { v7 as uuidv7 } from "uuid";
import { ImportRepository } from "./import.repository.js";

export class ImportUnitOfWork implements IImportUnitOfWork {
  private readonly tenantUnitOfWork: TenantUnitOfWork;
  constructor(database: Database) {
    this.tenantUnitOfWork = new TenantUnitOfWork(database);
  }
  run<T>(context: RequestContext, work: (repository: IImportRepository) => Promise<T>): Promise<T> {
    return this.tenantUnitOfWork.run(
      { workspaceId: context.workspaceId, actorId: context.userId },
      (database) => work(new ImportRepository(database, context, uuidv7)),
    );
  }
}
