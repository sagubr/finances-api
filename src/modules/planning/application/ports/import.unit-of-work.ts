import type { RequestContext } from "#/modules/platform/application/request-context.js";
import type { IImportRepository } from "./import.repository.js";

export interface IImportUnitOfWork {
  run<T>(context: RequestContext, work: (repository: IImportRepository) => Promise<T>): Promise<T>;
}
