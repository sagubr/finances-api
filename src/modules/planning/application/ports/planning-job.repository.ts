export type ScheduledRecurringRule = Readonly<{
  id: bigint;
  publicId: string;
  accountId: bigint;
  creditCardId: bigint | null;
  categoryId: bigint | null;
  type: "INCOME" | "EXPENSE";
  description: string;
  amountCents: bigint;
  currency: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  dayOfMonth: number | null;
  endsOn: string | null;
  nextOccurrenceOn: string;
}>;

export type ClosedStatement = Readonly<{
  publicId: string;
  totalCents: bigint;
  version: number;
}>;

export type BudgetConsumption = Readonly<{
  id: bigint;
  publicId: string;
  version: number;
  limitCents: bigint;
  realizedCents: bigint;
}>;

export type ExpiredImportFile = Readonly<{ id: bigint; storageKey: string }>;

export interface IPlanningJobRepository {
  listActiveRuleIds(referenceOn: string): Promise<readonly string[]>;
  findRule(publicId: string): Promise<ScheduledRecurringRule | null>;
  createOccurrence(publicId: string, ruleId: bigint, logicalDate: string): Promise<bigint | null>;
  createPlannedTransaction(
    publicId: string,
    rule: ScheduledRecurringRule,
    logicalDate: string,
  ): Promise<bigint | null>;
  linkOccurrence(occurrenceId: bigint, transactionId: bigint): Promise<void>;
  advanceRule(ruleId: bigint, nextOccurrenceOn: string): Promise<void>;
  closeDueStatements(referenceOn: string): Promise<readonly ClosedStatement[]>;
  listBudgetConsumption(month: string): Promise<readonly BudgetConsumption[]>;
  registerBudgetThreshold(
    budgetId: bigint,
    thresholdBps: number,
    budgetVersion: number,
  ): Promise<boolean>;
  listExpiredImportFiles(before: Date, limit: number): Promise<readonly ExpiredImportFile[]>;
  markImportFileRemoved(id: bigint): Promise<void>;
  writeEvent(
    input: Readonly<{
      eventId: string;
      name: string;
      aggregateType: string;
      aggregateId: string;
      aggregateVersion: number;
      correlationId: string;
      payload: unknown;
    }>,
  ): Promise<void>;
}
