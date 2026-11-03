import type {
  RecurringInput,
  RecurringPatch,
  RecurringRuleView,
} from "#/modules/planning/dtos/planning.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export interface IRecurringRepository {
  list(query: CursorPaginationQuery): Promise<CursorPage<RecurringRuleView>>;
  create(publicId: string, input: RecurringInput): Promise<RecurringRuleView>;
  toggle(
    publicId: string,
    expectedVersion: number,
    paused: boolean,
  ): Promise<Readonly<{ id: string; version: number; paused: boolean }>>;
  update(publicId: string, input: RecurringPatch): Promise<RecurringRuleView>;
  delete(
    publicId: string,
    expectedVersion: number,
    deletePlannedOccurrences: boolean,
  ): Promise<Readonly<{ id: string; deleted: true; version: number }>>;
}
