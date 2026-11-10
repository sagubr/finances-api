import {
  identity,
  publicId,
  tenantIndex,
  tenantPolicy,
  timestamps,
} from "#/infrastructure/database/schema.helpers.js";
import { users, workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const accountType = pgEnum("account_type", [
  "CHECKING",
  "SAVINGS",
  "CASH",
  "BROKERAGE",
  "BENEFIT",
  "OTHER",
]);
export const categoryType = pgEnum("category_type", ["INCOME", "EXPENSE"]);
export const transactionType = pgEnum("transaction_type", [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "CARD_PAYMENT",
  "INVESTMENT",
]);
export const transactionStatus = pgEnum("transaction_status", ["PLANNED", "CONFIRMED", "SETTLED"]);
export const transactionLocationSource = pgEnum("transaction_location_source", [
  "DEVICE",
  "MAP_PIN",
]);

export const accounts = pgTable(
  "accounts",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    type: accountType("type").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    openingBalanceCents: bigint("opening_balance_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    openingBalanceOn: date("opening_balance_on").notNull(),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "bigint" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "bigint" }).references(() => users.id),
    ...timestamps,
  },
  (table) => [
    tenantIndex("accounts", table.workspaceId),
    uniqueIndex("accounts_workspace_name_unique")
      .on(table.workspaceId, table.name)
      .where(sql`${table.deletedAt} is null`),
    tenantPolicy("accounts", table.workspaceId),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    type: categoryType("type").notNull(),
    color: varchar("color", { length: 7 }),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    tenantIndex("categories", table.workspaceId),
    uniqueIndex("categories_workspace_name_type_unique").on(
      table.workspaceId,
      table.name,
      table.type,
    ),
    tenantPolicy("categories", table.workspaceId),
  ],
).enableRLS();

export const transactions = pgTable(
  "transactions",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    accountId: bigint("account_id", { mode: "bigint" })
      .notNull()
      .references(() => accounts.id),
    categoryId: bigint("category_id", { mode: "bigint" }).references(() => categories.id),
    type: transactionType("type").notNull(),
    status: transactionStatus("status").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    occurredOn: date("occurred_on").notNull(),
    competenceMonth: varchar("competence_month", { length: 7 }).notNull(),
    settledOn: date("settled_on"),
    sourceModule: varchar("source_module", { length: 40 }),
    sourcePublicId: uuid("source_public_id"),
    sourceSequence: integer("source_sequence"),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "bigint" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "bigint" }).references(() => users.id),
    ...timestamps,
  },
  (table) => [
    tenantIndex("transactions", table.workspaceId),
    index("transactions_workspace_competence_idx").on(
      table.workspaceId,
      table.competenceMonth,
      table.occurredOn,
      table.id,
    ),
    index("transactions_workspace_account_idx").on(
      table.workspaceId,
      table.accountId,
      table.occurredOn,
    ),
    uniqueIndex("transactions_source_unique")
      .on(table.workspaceId, table.sourceModule, table.sourcePublicId, table.sourceSequence)
      .where(sql`${table.sourcePublicId} is not null`),
    check("transactions_amount_positive", sql`${table.amountCents} > 0`),
    check(
      "transactions_competence_format",
      sql`${table.competenceMonth} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
    check(
      "transactions_competence_matches_date",
      sql`${table.competenceMonth} = substring(${table.occurredOn}::text from 1 for 7)`,
    ),
    check(
      "transactions_settlement_consistency",
      sql`(${table.status} = 'SETTLED' and ${table.settledOn} is not null) or (${table.status} <> 'SETTLED' and ${table.settledOn} is null)`,
    ),
    tenantPolicy("transactions", table.workspaceId),
  ],
).enableRLS();

export const transactionLocations = pgTable(
  "transaction_locations",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    transactionId: bigint("transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    accuracyMeters: doublePrecision("accuracy_meters"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    source: transactionLocationSource("source").notNull(),
    createdBy: bigint("created_by", { mode: "bigint" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "bigint" }).references(() => users.id),
    ...timestamps,
  },
  (table) => [
    tenantIndex("transaction_locations", table.workspaceId),
    uniqueIndex("transaction_locations_transaction_unique").on(table.transactionId),
    check(
      "transaction_locations_latitude_range",
      sql`${table.latitude} >= -90 and ${table.latitude} <= 90`,
    ),
    check(
      "transaction_locations_longitude_range",
      sql`${table.longitude} >= -180 and ${table.longitude} <= 180`,
    ),
    check(
      "transaction_locations_accuracy_positive",
      sql`${table.accuracyMeters} is null or ${table.accuracyMeters} > 0`,
    ),
    check(
      "transaction_locations_source_accuracy",
      sql`${table.source} <> 'MAP_PIN' or ${table.accuracyMeters} is null`,
    ),
    tenantPolicy("transaction_locations", table.workspaceId),
  ],
).enableRLS();

export const transactionHistory = pgTable(
  "transaction_history",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    transactionId: bigint("transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id),
    transactionPublicId: uuid("transaction_public_id").notNull(),
    version: integer("version").notNull(),
    action: varchar("action", { length: 30 }).notNull(),
    actorId: bigint("actor_id", { mode: "bigint" }).references(() => users.id),
    snapshot: jsonb("snapshot").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("transaction_history", table.workspaceId),
    tenantPolicy("transaction_history", table.workspaceId),
  ],
).enableRLS();

export const transferPairs = pgTable(
  "transfer_pairs",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    debitTransactionId: bigint("debit_transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id),
    creditTransactionId: bigint("credit_transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("transfer_pairs", table.workspaceId),
    uniqueIndex("transfer_pairs_debit_unique").on(table.debitTransactionId),
    uniqueIndex("transfer_pairs_credit_unique").on(table.creditTransactionId),
    check(
      "transfer_pairs_distinct_legs",
      sql`${table.debitTransactionId} <> ${table.creditTransactionId}`,
    ),
    tenantPolicy("transfer_pairs", table.workspaceId),
  ],
).enableRLS();
