import type {
  BudgetInput,
  BudgetPatch,
  BudgetProgressItem,
  BudgetProgressQuery,
  BudgetQuery,
  BudgetView,
  CopyBudgetsInput,
} from "#/modules/planning/dtos/planning.dto.js";
import type { CursorPage } from "#/shared/pagination/cursor-pagination.js";
export interface IBudgetRepository {
  list(query: BudgetQuery): Promise<CursorPage<BudgetView>>;
  create(publicId: string, input: BudgetInput): Promise<BudgetView>;
  update(publicId: string, input: BudgetPatch): Promise<BudgetView>;
  delete(publicId: string, expectedVersion: number): Promise<void>;
  copy(
    input: CopyBudgetsInput,
    generateId: () => string,
  ): Promise<Readonly<{ sourceMonth: string; targetMonth: string; copied: number }>>;
  progress(query: BudgetProgressQuery): Promise<CursorPage<BudgetProgressItem>>;
}
