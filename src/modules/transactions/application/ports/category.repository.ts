import type { Category } from "#/modules/transactions/domain/category.js";
import type { CategoryInput, CategoryPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export interface ICategoryRepository {
  list(query: CursorPaginationQuery): Promise<CursorPage<Category>>;
  create(publicId: string, input: CategoryInput): Promise<Category | null>;
  update(publicId: string, input: CategoryPatch): Promise<Category | null>;
  deactivate(publicId: string, expectedVersion: number): Promise<boolean>;
}
