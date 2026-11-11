import {
  identity,
  publicId,
  tenantIndex,
  tenantPolicy,
  timestamps,
} from "#/infrastructure/database/schema.helpers.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  categoryType,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const importStatus = pgEnum("import_status", [
  "UPLOADED",
  "PROCESSING",
  "PREVIEWED",
  "COMMITTED",
  "ROLLED_BACK",
  "FAILED",
]);
export const importRowStatus = pgEnum("import_row_status", [
  "VALID",
  "WARNING",
  "ERROR",
  "COMMITTED",
  "SKIPPED",
]);
export const recurrenceFrequency = pgEnum("recurrence_frequency", ["WEEKLY", "MONTHLY", "YEARLY"]);
export const statementStatus = pgEnum("statement_status", [
  "OPEN",
  "CLOSED",
  "PARTIALLY_PAID",
  "PAID",
]);
export const cardAccountingMode = pgEnum("card_accounting_mode", ["DETAILED", "PAYMENT_ONLY"]);
export const creditCardBrand = pgEnum("credit_card_brand", [
  "VISA",
  "MASTERCARD",
  "ELO",
  "AMEX",
  "HIPERCARD",
  "OTHER",
]);

export const importBatches = pgTable(
  "import_batches",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    status: importStatus("status").notNull().default("UPLOADED"),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    fileSize: bigint("file_size", { mode: "bigint" }).notNull(),
    rowCount: integer("row_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    tenantIndex("import_batches", table.workspaceId),
    uniqueIndex("import_batches_checksum_unique").on(table.workspaceId, table.checksum),
    tenantPolicy("import_batches", table.workspaceId),
  ],
).enableRLS();

export const importRows = pgTable(
  "import_rows",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    batchId: bigint("batch_id", { mode: "bigint" })
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    status: importRowStatus("status").notNull(),
    raw: jsonb("raw").notNull(),
    normalized: jsonb("normalized"),
    fingerprint: varchar("fingerprint", { length: 64 }),
    errors: jsonb("errors").notNull().default([]),
    transactionId: bigint("transaction_id", { mode: "bigint" }).references(() => transactions.id),
  },
  (table) => [
    uniqueIndex("import_rows_batch_number_unique").on(table.batchId, table.rowNumber),
    tenantIndex("import_rows", table.workspaceId),
    tenantPolicy("import_rows", table.workspaceId),
  ],
).enableRLS();

export const importColumnMappings = pgTable(
  "import_column_mappings",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    batchId: bigint("batch_id", { mode: "bigint" })
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    sourceColumn: varchar("source_column", { length: 160 }).notNull(),
    targetField: varchar("target_field", { length: 80 }).notNull(),
    parserConfig: jsonb("parser_config").notNull().default({}),
  },
  (table) => [
    tenantIndex("import_column_mappings", table.workspaceId),
    tenantPolicy("import_column_mappings", table.workspaceId),
  ],
).enableRLS();

export const importCommits = pgTable(
  "import_commits",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    batchId: bigint("batch_id", { mode: "bigint" })
      .notNull()
      .references(() => importBatches.id),
    selectedRowIds: jsonb("selected_row_ids").notNull(),
    committedCount: integer("committed_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  },
  (table) => [
    tenantIndex("import_commits", table.workspaceId),
    tenantPolicy("import_commits", table.workspaceId),
  ],
).enableRLS();

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    accountId: bigint("account_id", { mode: "bigint" })
      .notNull()
      .references(() => accounts.id),
    creditCardId: bigint("credit_card_id", { mode: "bigint" }).references(
      (): AnyPgColumn => creditCards.id,
    ),
    categoryId: bigint("category_id", { mode: "bigint" }).references(() => categories.id),
    type: categoryType("type").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    frequency: recurrenceFrequency("frequency").notNull(),
    interval: integer("interval").notNull().default(1),
    dayOfMonth: integer("day_of_month"),
    dayOfWeek: integer("day_of_week"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    nextOccurrenceOn: date("next_occurrence_on").notNull(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    timezone: varchar("timezone", { length: 80 }).notNull(),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    tenantIndex("recurring_rules", table.workspaceId),
    check("recurring_rules_interval_positive", sql`${table.interval} > 0`),
    check("recurring_rules_amount_positive", sql`${table.amountCents} > 0`),
    tenantPolicy("recurring_rules", table.workspaceId),
  ],
).enableRLS();

export const recurringOccurrences = pgTable(
  "recurring_occurrences",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    ruleId: bigint("rule_id", { mode: "bigint" })
      .notNull()
      .references(() => recurringRules.id),
    logicalDate: date("logical_date").notNull(),
    transactionId: bigint("transaction_id", { mode: "bigint" }).references(() => transactions.id),
    detachedAt: timestamp("detached_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("recurring_occurrences_rule_date_unique").on(table.ruleId, table.logicalDate),
    tenantIndex("recurring_occurrences", table.workspaceId),
    tenantPolicy("recurring_occurrences", table.workspaceId),
  ],
).enableRLS();

export const installmentPlans = pgTable(
  "installment_plans",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    creditCardId: bigint("credit_card_id", { mode: "bigint" }).references(
      (): AnyPgColumn => creditCards.id,
    ),
    description: varchar("description", { length: 500 }).notNull(),
    totalAmountCents: bigint("total_amount_cents", { mode: "bigint" }).notNull(),
    installments: integer("installments").notNull(),
    firstDueOn: date("first_due_on").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    check("installment_plans_total_positive", sql`${table.totalAmountCents} > 0`),
    check("installment_plans_count_positive", sql`${table.installments} > 0`),
    tenantIndex("installment_plans", table.workspaceId),
    tenantPolicy("installment_plans", table.workspaceId),
  ],
).enableRLS();

export const creditCards = pgTable(
  "credit_cards",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    brand: creditCardBrand("brand"),
    lastFour: varchar("last_four", { length: 4 }),
    currency: varchar("currency", { length: 3 }).notNull(),
    limitCents: bigint("limit_cents", { mode: "bigint" }).notNull(),
    closingDay: integer("closing_day").notNull(),
    dueDay: integer("due_day").notNull(),
    accountingMode: cardAccountingMode("accounting_mode").notNull().default("DETAILED"),
    paymentAccountId: bigint("payment_account_id", { mode: "bigint" }).references(
      () => accounts.id,
    ),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    check(
      "credit_cards_days",
      sql`${table.closingDay} between 1 and 31 and ${table.dueDay} between 1 and 31`,
    ),
    tenantIndex("credit_cards", table.workspaceId),
    tenantPolicy("credit_cards", table.workspaceId),
  ],
).enableRLS();

export const cardStatements = pgTable(
  "card_statements",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    cardId: bigint("card_id", { mode: "bigint" })
      .notNull()
      .references(() => creditCards.id),
    cycleStartOn: date("cycle_start_on").notNull(),
    cycleEndOn: date("cycle_end_on").notNull(),
    dueOn: date("due_on").notNull(),
    status: statementStatus("status").notNull().default("OPEN"),
    accountingMode: cardAccountingMode("accounting_mode").notNull(),
    totalCents: bigint("total_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    paidCents: bigint("paid_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("card_statements_cycle_unique").on(table.cardId, table.cycleStartOn),
    tenantIndex("card_statements", table.workspaceId),
    tenantPolicy("card_statements", table.workspaceId),
  ],
).enableRLS();

export const statementCycles = pgTable(
  "statement_cycles",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    statementId: bigint("statement_id", { mode: "bigint" })
      .notNull()
      .references(() => cardStatements.id),
    transactionId: bigint("transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id),
    attachedAt: timestamp("attached_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("statement_cycles_transaction_unique").on(table.transactionId),
    tenantIndex("statement_cycles", table.workspaceId),
    tenantPolicy("statement_cycles", table.workspaceId),
  ],
).enableRLS();

export const statementPayments = pgTable(
  "statement_payments",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    statementId: bigint("statement_id", { mode: "bigint" })
      .notNull()
      .references(() => cardStatements.id),
    transactionId: bigint("transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    paidOn: date("paid_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("statement_payments", table.workspaceId),
    tenantPolicy("statement_payments", table.workspaceId),
  ],
).enableRLS();

export const statementAdjustments = pgTable(
  "statement_adjustments",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    statementId: bigint("statement_id", { mode: "bigint" })
      .notNull()
      .references(() => cardStatements.id),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("statement_adjustments", table.workspaceId),
    tenantPolicy("statement_adjustments", table.workspaceId),
  ],
).enableRLS();

export const budgets = pgTable(
  "budgets",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    month: varchar("month", { length: 7 }).notNull(),
    categoryId: bigint("category_id", { mode: "bigint" })
      .notNull()
      .references(() => categories.id),
    limitCents: bigint("limit_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check("budgets_limit_nonnegative", sql`${table.limitCents} >= 0`),
    uniqueIndex("budgets_category_target_unique")
      .on(table.workspaceId, table.month, table.categoryId)
      .where(sql`${table.deletedAt} is null`),
    tenantPolicy("budgets", table.workspaceId),
  ],
).enableRLS();

export const budgetThresholdDeliveries = pgTable(
  "budget_threshold_deliveries",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    budgetId: bigint("budget_id", { mode: "bigint" })
      .notNull()
      .references(() => budgets.id),
    thresholdBps: integer("threshold_bps").notNull(),
    budgetVersion: integer("budget_version").notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budget_threshold_once_unique").on(
      table.budgetId,
      table.thresholdBps,
      table.budgetVersion,
    ),
    tenantIndex("budget_threshold_deliveries", table.workspaceId),
    tenantPolicy("budget_threshold_deliveries", table.workspaceId),
  ],
).enableRLS();
