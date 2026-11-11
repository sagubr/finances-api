import {
  identity,
  publicId,
  tenantIndex,
  tenantPolicy,
  timestamps,
} from "#/infrastructure/database/schema.helpers.js";
import { users, workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import { transactions } from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const goalType = pgEnum("goal_type", [
  "MANUAL",
  "COUNT",
  "AMOUNT_INVESTED",
  "NET_WORTH",
  "CATEGORY_LIMIT",
  "HABIT_HOURS",
]);
export const goalStatus = pgEnum("goal_status", ["ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"]);
export const wishlistStatus = pgEnum("wishlist_status", [
  "PLANNED",
  "PURCHASE_PENDING",
  "PURCHASED",
  "ARCHIVED",
]);
export const notificationChannel = pgEnum("notification_channel", ["IN_APP", "EMAIL", "PUSH"]);
export const notificationDeliveryStatus = pgEnum("notification_delivery_status", [
  "PENDING",
  "DELIVERED",
  "FAILED",
  "SKIPPED",
]);
export const subjectRequestStatus = pgEnum("subject_request_status", [
  "REQUESTED",
  "PROCESSING",
  "READY",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
]);
export const adminRole = pgEnum("admin_role", ["ADMIN", "SUPPORT", "FINANCE"]);

export const calculationRuleSets = pgTable(
  "calculation_rule_sets",
  {
    id: identity(),
    publicId: publicId(),
    code: varchar("code", { length: 80 }).notNull(),
    version: integer("version").notNull(),
    validFrom: date("valid_from").notNull(),
    validUntil: date("valid_until"),
    status: varchar("status", { length: 30 }).notNull().default("DRAFT"),
    roundingMode: varchar("rounding_mode", { length: 30 }).notNull().default("HALF_UP"),
    metadata: jsonb("metadata").notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("calculation_rule_sets_code_version_unique").on(table.code, table.version),
  ],
);

export const taxTables = pgTable(
  "tax_tables",
  {
    id: identity(),
    ruleSetId: bigint("rule_set_id", { mode: "bigint" })
      .notNull()
      .references(() => calculationRuleSets.id),
    code: varchar("code", { length: 80 }).notNull(),
    description: varchar("description", { length: 240 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [uniqueIndex("tax_tables_rule_code_unique").on(table.ruleSetId, table.code)],
);

export const taxBrackets = pgTable(
  "tax_brackets",
  {
    id: identity(),
    taxTableId: bigint("tax_table_id", { mode: "bigint" })
      .notNull()
      .references(() => taxTables.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    lowerBoundCents: bigint("lower_bound_cents", { mode: "bigint" }).notNull(),
    upperBoundCents: bigint("upper_bound_cents", { mode: "bigint" }),
    rateBps: integer("rate_bps").notNull(),
    deductionCents: bigint("deduction_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
  },
  (table) => [
    uniqueIndex("tax_brackets_table_order_unique").on(table.taxTableId, table.order),
    check(
      "tax_brackets_bounds",
      sql`${table.lowerBoundCents} >= 0 and (${table.upperBoundCents} is null or ${table.upperBoundCents} > ${table.lowerBoundCents})`,
    ),
  ],
);

export const legalSources = pgTable("legal_sources", {
  id: identity(),
  publicId: publicId(),
  title: varchar("title", { length: 240 }).notNull(),
  uri: text("uri").notNull(),
  publishedOn: date("published_on"),
  checksum: varchar("checksum", { length: 64 }),
  ...timestamps,
});

export const ruleSetApprovals = pgTable(
  "rule_set_approvals",
  {
    ruleSetId: bigint("rule_set_id", { mode: "bigint" })
      .notNull()
      .references(() => calculationRuleSets.id),
    adminUserId: bigint("admin_user_id", { mode: "bigint" }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
    reason: varchar("reason", { length: 500 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.ruleSetId, table.adminUserId] })],
);

export const payrollSimulations = pgTable(
  "payroll_simulations",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    kind: varchar("kind", { length: 40 }).notNull(),
    referenceOn: date("reference_on").notNull(),
    ruleSetId: bigint("rule_set_id", { mode: "bigint" })
      .notNull()
      .references(() => calculationRuleSets.id),
    revision: integer("revision").notNull().default(1),
    input: jsonb("input").notNull(),
    result: jsonb("result").notNull(),
    calculationMemory: jsonb("calculation_memory").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("payroll_simulations", table.workspaceId),
    tenantPolicy("payroll_simulations", table.workspaceId),
  ],
).enableRLS();

export const severanceSimulations = pgTable(
  "severance_simulations",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    referenceOn: date("reference_on").notNull(),
    ruleSetId: bigint("rule_set_id", { mode: "bigint" })
      .notNull()
      .references(() => calculationRuleSets.id),
    revision: integer("revision").notNull().default(1),
    input: jsonb("input").notNull(),
    result: jsonb("result").notNull(),
    calculationMemory: jsonb("calculation_memory").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("severance_simulations", table.workspaceId),
    tenantPolicy("severance_simulations", table.workspaceId),
  ],
).enableRLS();

export const plannerActivities = pgTable(
  "planner_activities",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    color: varchar("color", { length: 7 }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    tenantIndex("planner_activities", table.workspaceId),
    tenantPolicy("planner_activities", table.workspaceId),
  ],
).enableRLS();

export const plannerTemplates = pgTable(
  "planner_templates",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    tenantIndex("planner_templates", table.workspaceId),
    tenantPolicy("planner_templates", table.workspaceId),
  ],
).enableRLS();

export const plannerSlots = pgTable(
  "planner_slots",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    templateId: bigint("template_id", { mode: "bigint" })
      .notNull()
      .references(() => plannerTemplates.id),
    activityId: bigint("activity_id", { mode: "bigint" })
      .notNull()
      .references(() => plannerActivities.id),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
  },
  (table) => [
    check(
      "planner_slots_range",
      sql`${table.weekday} between 0 and 6 and ${table.startMinute} between 0 and 1439 and ${table.durationMinutes} > 0 and ${table.startMinute} + ${table.durationMinutes} <= 1440`,
    ),
    tenantIndex("planner_slots", table.workspaceId),
    tenantPolicy("planner_slots", table.workspaceId),
  ],
).enableRLS();

export const plannerDayOverrides = pgTable(
  "planner_day_overrides",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    localDate: date("local_date").notNull(),
    mode: varchar("mode", { length: 30 }).notNull(),
    slots: jsonb("slots").notNull(),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("planner_overrides_date_unique").on(table.workspaceId, table.localDate),
    tenantPolicy("planner_day_overrides", table.workspaceId),
  ],
).enableRLS();

export const goals = pgTable(
  "goals",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 160 }).notNull(),
    type: goalType("type").notNull(),
    status: goalStatus("status").notNull().default("ACTIVE"),
    targetValue: numeric("target_value", { precision: 30, scale: 10 }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
    startsOn: date("starts_on").notNull(),
    dueOn: date("due_on"),
    version: integer("version").notNull().default(1),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check("goals_target_positive", sql`${table.targetValue} > 0`),
    tenantIndex("goals", table.workspaceId),
    tenantPolicy("goals", table.workspaceId),
  ],
).enableRLS();

export const goalSourceBindings = pgTable(
  "goal_source_bindings",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    goalId: bigint("goal_id", { mode: "bigint" })
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    sourceModule: varchar("source_module", { length: 40 }).notNull(),
    sourceType: varchar("source_type", { length: 60 }).notNull(),
    sourcePublicId: uuid("source_public_id"),
    config: jsonb("config").notNull().default({}),
  },
  (table) => [
    tenantIndex("goal_source_bindings", table.workspaceId),
    tenantPolicy("goal_source_bindings", table.workspaceId),
  ],
).enableRLS();

export const goalCheckins = pgTable(
  "goal_checkins",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    goalId: bigint("goal_id", { mode: "bigint" })
      .notNull()
      .references(() => goals.id),
    value: numeric("value", { precision: 30, scale: 10 }).notNull(),
    checkedOn: date("checked_on").notNull(),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("goal_checkins", table.workspaceId),
    tenantPolicy("goal_checkins", table.workspaceId),
  ],
).enableRLS();

export const goalProgressSnapshots = pgTable(
  "goal_progress_snapshots",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    goalId: bigint("goal_id", { mode: "bigint" })
      .notNull()
      .references(() => goals.id),
    currentValue: numeric("current_value", { precision: 30, scale: 10 }).notNull(),
    sourceVersion: varchar("source_version", { length: 120 }).notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("goal_progress_goal_time_idx").on(table.goalId, table.calculatedAt),
    tenantIndex("goal_progress_snapshots", table.workspaceId),
    tenantPolicy("goal_progress_snapshots", table.workspaceId),
  ],
).enableRLS();

export const goalEventDeliveries = pgTable(
  "goal_event_deliveries",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    goalId: bigint("goal_id", { mode: "bigint" })
      .notNull()
      .references(() => goals.id),
    kind: varchar("kind", { length: 60 }).notNull(),
    windowKey: varchar("window_key", { length: 80 }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("goal_delivery_unique").on(table.goalId, table.kind, table.windowKey),
    tenantPolicy("goal_event_deliveries", table.workspaceId),
  ],
).enableRLS();

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 200 }).notNull(),
    url: varchar("url", { length: 2048 }),
    estimatedPriceCents: bigint("estimated_price_cents", { mode: "bigint" }),
    currency: varchar("currency", { length: 3 }).notNull(),
    priority: integer("priority").notNull().default(0),
    reason: varchar("reason", { length: 500 }),
    plannedOn: date("planned_on"),
    status: wishlistStatus("status").notNull().default("PLANNED"),
    actualPriceCents: bigint("actual_price_cents", { mode: "bigint" }),
    purchasedOn: date("purchased_on"),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    tenantIndex("wishlist_items", table.workspaceId),
    index("wishlist_items_workspace_status_planned_idx").on(
      table.workspaceId,
      table.status,
      table.plannedOn,
    ),
    check("wishlist_items_priority_range", sql`${table.priority} between 0 and 10`),
    check(
      "wishlist_items_estimated_price_positive",
      sql`${table.estimatedPriceCents} is null or ${table.estimatedPriceCents} > 0`,
    ),
    check(
      "wishlist_items_actual_price_positive",
      sql`${table.actualPriceCents} is null or ${table.actualPriceCents} > 0`,
    ),
    check("wishlist_items_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    tenantPolicy("wishlist_items", table.workspaceId),
  ],
).enableRLS();

export const wishlistPurchaseLinks = pgTable(
  "wishlist_purchase_links",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    itemId: bigint("item_id", { mode: "bigint" })
      .notNull()
      .references(() => wishlistItems.id)
      .unique(),
    transactionId: bigint("transaction_id", { mode: "bigint" })
      .notNull()
      .references(() => transactions.id),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("wishlist_purchase_links", table.workspaceId),
    tenantPolicy("wishlist_purchase_links", table.workspaceId),
  ],
).enableRLS();

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    notificationType: varchar("notification_type", { length: 100 }).notNull(),
    channel: notificationChannel("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    quietStart: time("quiet_start"),
    quietEnd: time("quiet_end"),
    timezone: varchar("timezone", { length: 80 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("notification_preferences_unique").on(
      table.workspaceId,
      table.userId,
      table.notificationType,
      table.channel,
    ),
    tenantPolicy("notification_preferences", table.workspaceId),
  ],
).enableRLS();

export const notifications = pgTable(
  "notifications",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 100 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 1000 }).notNull(),
    referenceType: varchar("reference_type", { length: 80 }),
    referencePublicId: uuid("reference_public_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_unread_idx").on(table.workspaceId, table.userId, table.readAt),
    tenantPolicy("notifications", table.workspaceId),
  ],
).enableRLS();

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    notificationId: bigint("notification_id", { mode: "bigint" })
      .notNull()
      .references(() => notifications.id),
    channel: notificationChannel("channel").notNull(),
    status: notificationDeliveryStatus("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    errorCode: varchar("error_code", { length: 100 }),
  },
  (table) => [
    tenantIndex("notification_deliveries", table.workspaceId),
    tenantPolicy("notification_deliveries", table.workspaceId),
  ],
).enableRLS();

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    endpointHash: varchar("endpoint_hash", { length: 64 }).notNull().unique(),
    endpointEncrypted: text("endpoint_encrypted").notNull(),
    keysEncrypted: text("keys_encrypted").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    tenantIndex("push_subscriptions", table.workspaceId),
    tenantPolicy("push_subscriptions", table.workspaceId),
  ],
).enableRLS();

export const unsubscribeTokens = pgTable("unsubscribe_tokens", {
  id: identity(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  userId: bigint("user_id", { mode: "bigint" })
    .notNull()
    .references(() => users.id),
  purpose: varchar("purpose", { length: 100 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationDeduplication = pgTable(
  "notification_deduplication",
  {
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 100 }).notNull(),
    referenceKey: varchar("reference_key", { length: 200 }).notNull(),
    windowKey: varchar("window_key", { length: 80 }).notNull(),
    notificationId: bigint("notification_id", { mode: "bigint" })
      .notNull()
      .references(() => notifications.id),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.type, table.referenceKey, table.windowKey] }),
  ],
);

export const plans = pgTable("plans", {
  id: identity(),
  publicId: publicId(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const planVersions = pgTable(
  "plan_versions",
  {
    id: identity(),
    publicId: publicId(),
    planId: bigint("plan_id", { mode: "bigint" })
      .notNull()
      .references(() => plans.id),
    version: integer("version").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    priceCents: bigint("price_cents", { mode: "bigint" }).notNull(),
    entitlements: jsonb("entitlements").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("plan_versions_unique").on(table.planId, table.version)],
);

export const billingCustomers = pgTable(
  "billing_customers",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id)
      .unique(),
    provider: varchar("provider", { length: 60 }).notNull(),
    providerCustomerId: varchar("provider_customer_id", { length: 200 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [tenantPolicy("billing_customers", table.workspaceId)],
).enableRLS();

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    planVersionId: bigint("plan_version_id", { mode: "bigint" })
      .notNull()
      .references(() => planVersions.id),
    status: subscriptionStatus("status").notNull(),
    providerSubscriptionId: varchar("provider_subscription_id", { length: 200 }).unique(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    providerVersion: varchar("provider_version", { length: 100 }),
    ...timestamps,
  },
  (table) => [
    tenantIndex("subscriptions", table.workspaceId),
    tenantPolicy("subscriptions", table.workspaceId),
  ],
).enableRLS();

export const subscriptionStateChanges = pgTable(
  "subscription_state_changes",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    subscriptionId: bigint("subscription_id", { mode: "bigint" })
      .notNull()
      .references(() => subscriptions.id),
    fromStatus: subscriptionStatus("from_status"),
    toStatus: subscriptionStatus("to_status").notNull(),
    reason: varchar("reason", { length: 200 }),
    providerOccurredAt: timestamp("provider_occurred_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("subscription_state_changes", table.workspaceId),
    tenantPolicy("subscription_state_changes", table.workspaceId),
  ],
).enableRLS();

export const usageCounters = pgTable(
  "usage_counters",
  {
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    key: varchar("key", { length: 100 }).notNull(),
    period: varchar("period", { length: 20 }).notNull(),
    value: bigint("value", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.key, table.period] }),
    tenantPolicy("usage_counters", table.workspaceId),
  ],
).enableRLS();

export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: identity(),
    provider: varchar("provider", { length: 60 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 200 }).notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    rawPayload: text("raw_payload").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    providerOccurredAt: timestamp("provider_occurred_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_webhook_provider_event_unique").on(table.provider, table.providerEventId),
  ],
);

export const adminUsers = pgTable("admin_users", {
  id: identity(),
  publicId: publicId(),
  userId: bigint("user_id", { mode: "bigint" })
    .notNull()
    .references(() => users.id)
    .unique(),
  totpSecretEncrypted: text("totp_secret_encrypted"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const adminRoles = pgTable(
  "admin_roles",
  {
    adminUserId: bigint("admin_user_id", { mode: "bigint" })
      .notNull()
      .references(() => adminUsers.id),
    role: adminRole("role").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.adminUserId, table.role] })],
);

export const adminAuditLog = pgTable("admin_audit_log", {
  id: identity(),
  publicId: publicId(),
  adminUserId: bigint("admin_user_id", { mode: "bigint" })
    .notNull()
    .references(() => adminUsers.id),
  action: varchar("action", { length: 160 }).notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  targetType: varchar("target_type", { length: 100 }).notNull(),
  targetPublicId: uuid("target_public_id"),
  requestId: varchar("request_id", { length: 128 }).notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportAccessGrants = pgTable("support_access_grants", {
  id: identity(),
  publicId: publicId(),
  adminUserId: bigint("admin_user_id", { mode: "bigint" })
    .notNull()
    .references(() => adminUsers.id),
  workspaceId: bigint("workspace_id", { mode: "bigint" })
    .notNull()
    .references(() => workspaces.id),
  purpose: varchar("purpose", { length: 500 }).notNull(),
  grantedByUserId: bigint("granted_by_user_id", { mode: "bigint" }).references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: identity(),
    publicId: publicId(),
    requestedByAdminId: bigint("requested_by_admin_id", { mode: "bigint" })
      .notNull()
      .references(() => adminUsers.id),
    approvedByAdminId: bigint("approved_by_admin_id", { mode: "bigint" }).references(
      () => adminUsers.id,
    ),
    action: varchar("action", { length: 160 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),
    reason: varchar("reason", { length: 500 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "approval_distinct_actors",
      sql`${table.approvedByAdminId} is null or ${table.approvedByAdminId} <> ${table.requestedByAdminId}`,
    ),
  ],
);

export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: identity(),
    publicId: publicId(),
    kind: varchar("kind", { length: 80 }).notNull(),
    version: varchar("version", { length: 40 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    contentUri: text("content_uri").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("legal_documents_kind_version_unique").on(table.kind, table.version)],
);

export const consents = pgTable(
  "consents",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    documentId: bigint("document_id", { mode: "bigint" })
      .notNull()
      .references(() => legalDocuments.id),
    purpose: varchar("purpose", { length: 160 }).notNull(),
    evidence: jsonb("evidence").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [
    tenantIndex("consents", table.workspaceId),
    tenantPolicy("consents", table.workspaceId),
  ],
).enableRLS();

export const dataSubjectRequests = pgTable(
  "data_subject_requests",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    kind: varchar("kind", { length: 50 }).notNull(),
    status: subjectRequestStatus("status").notNull().default("REQUESTED"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failure: jsonb("failure"),
  },
  (table) => [
    tenantIndex("data_subject_requests", table.workspaceId),
    tenantPolicy("data_subject_requests", table.workspaceId),
  ],
).enableRLS();

export const dataExportRequests = pgTable(
  "data_export_requests",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    subjectRequestId: bigint("subject_request_id", { mode: "bigint" })
      .notNull()
      .references(() => dataSubjectRequests.id),
    storageKey: text("storage_key"),
    encrypted: boolean("encrypted").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    downloadTokenHash: varchar("download_token_hash", { length: 64 }),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
  },
  (table) => [
    tenantIndex("data_export_requests", table.workspaceId),
    tenantPolicy("data_export_requests", table.workspaceId),
  ],
).enableRLS();

export const accountDeletionRequests = pgTable(
  "account_deletion_requests",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    subjectRequestId: bigint("subject_request_id", { mode: "bigint" })
      .notNull()
      .references(() => dataSubjectRequests.id),
    executeAfter: timestamp("execute_after", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    tombstone: jsonb("tombstone"),
  },
  (table) => [
    tenantIndex("account_deletion_requests", table.workspaceId),
    tenantPolicy("account_deletion_requests", table.workspaceId),
  ],
).enableRLS();

export const deletionModuleRuns = pgTable(
  "deletion_module_runs",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    deletionRequestId: bigint("deletion_request_id", { mode: "bigint" })
      .notNull()
      .references(() => accountDeletionRequests.id),
    module: varchar("module", { length: 80 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    result: jsonb("result"),
    attempts: integer("attempts").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("deletion_module_run_unique").on(table.deletionRequestId, table.module),
    tenantPolicy("deletion_module_runs", table.workspaceId),
  ],
).enableRLS();

export const sensitiveAccessLog = pgTable(
  "sensitive_access_log",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    actorType: varchar("actor_type", { length: 40 }).notNull(),
    actorPublicId: uuid("actor_public_id"),
    action: varchar("action", { length: 160 }).notNull(),
    purpose: varchar("purpose", { length: 500 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    requestId: varchar("request_id", { length: 128 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("sensitive_access_log", table.workspaceId),
    tenantPolicy("sensitive_access_log", table.workspaceId),
  ],
).enableRLS();
