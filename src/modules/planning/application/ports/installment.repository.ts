import type {
  InstallmentPatch,
  InstallmentPlanSummary,
  InstallmentPlanView,
  InstallmentQuery,
  InstallmentsInput,
} from "#/modules/planning/dtos/planning.dto.js";
export interface IInstallmentRepository {
  list(query: InstallmentQuery): Promise<{
    items: readonly InstallmentPlanSummary[];
    pageInfo: Readonly<{ nextCursor: string | null; hasNextPage: boolean }>;
  }>;
  create(
    planId: string,
    transactionIds: readonly string[],
    statementIds: readonly string[],
    input: InstallmentsInput,
  ): Promise<InstallmentPlanView>;
  update(planId: string, input: InstallmentPatch): Promise<InstallmentPlanSummary>;
  delete(planId: string, expectedVersion: number): Promise<void>;
}
