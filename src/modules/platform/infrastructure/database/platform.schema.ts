import {
  identity,
  publicId,
  tenantIndex,
  tenantPolicy,
  timestamps,
} from "#/infrastructure/database/schema.helpers.js";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceRole = pgEnum("workspace_role", ["OWNER", "EDITOR", "VIEWER"]);
export const authSchema = pgSchema("auth");
export const tokenPurpose = authSchema.enum("token_purpose", [
  "EMAIL_CONFIRMATION",
  "PASSWORD_RESET",
]);
export const jobStatus = pgEnum("job_status", [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "DEAD",
]);

export const users = pgTable(
  "users",
  {
    id: identity(),
    publicId: publicId(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    emailConfirmedAt: timestamp("email_confirmed_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(sql`lower(${table.email})`)],
);

export const userCredentials = authSchema.table("user_credentials", {
  userId: bigint("user_id", { mode: "bigint" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordVersion: integer("password_version").notNull().default(1),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: identity(),
  publicId: publicId(),
  name: varchar("name", { length: 120 }).notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("America/Sao_Paulo"),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("BRL"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull(),
    active: boolean("active").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_idx").on(table.userId),
    pgPolicy("workspace_members_workspace_policy", {
      for: "all",
      to: "public",
      using: sql`${table.workspaceId} = nullif(current_setting('app.workspace_id', true), '')::bigint or ${table.userId} = nullif(current_setting('app.actor_id', true), '')::bigint`,
      withCheck: sql`${table.workspaceId} = nullif(current_setting('app.workspace_id', true), '')::bigint`,
    }),
  ],
).enableRLS();

export const sessions = authSchema.table(
  "sessions",
  {
    id: identity(),
    publicId: publicId(),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    familyId: uuid("family_id").notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const emailTokens = authSchema.table("email_tokens", {
  id: identity(),
  publicId: publicId(),
  userId: bigint("user_id", { mode: "bigint" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: tokenPurpose("purpose").notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  tokenCiphertext: text("token_ciphertext").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = authSchema.table(
  "login_attempts",
  {
    id: identity(),
    emailHash: varchar("email_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("login_attempts_email_time_idx").on(table.emailHash, table.attemptedAt),
    index("login_attempts_ip_time_idx").on(table.ipHash, table.attemptedAt),
  ],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
    config: jsonb("config").notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("feature_flags_workspace_key_unique").on(table.workspaceId, table.key),
    tenantIndex("feature_flags", table.workspaceId),
    tenantPolicy("feature_flags", table.workspaceId),
  ],
).enableRLS();

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: bigint("actor_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    operation: varchar("operation", { length: 160 }).notNull(),
    key: varchar("key", { length: 128 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idempotency_scope_unique").on(
      table.workspaceId,
      table.actorId,
      table.operation,
      table.key,
    ),
    tenantIndex("idempotency_records", table.workspaceId),
    tenantPolicy("idempotency_records", table.workspaceId),
  ],
).enableRLS();

export const auditLog = pgTable(
  "audit_log",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    actorId: bigint("actor_id", { mode: "bigint" }).references(() => users.id),
    action: varchar("action", { length: 160 }).notNull(),
    resourceType: varchar("resource_type", { length: 100 }).notNull(),
    resourcePublicId: uuid("resource_public_id"),
    requestId: varchar("request_id", { length: 128 }).notNull(),
    changes: jsonb("changes").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("audit_log", table.workspaceId),
    tenantPolicy("audit_log", table.workspaceId),
  ],
).enableRLS();

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: identity(),
    eventId: uuid("event_id").notNull().unique(),
    workspaceId: bigint("workspace_id", { mode: "bigint" }).references(() => workspaces.id),
    eventName: varchar("event_name", { length: 120 }).notNull(),
    eventVersion: integer("event_version").notNull(),
    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    aggregatePublicId: uuid("aggregate_public_id").notNull(),
    aggregateVersion: integer("aggregate_version").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    causationId: uuid("causation_id"),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
  },
  (table) => [index("outbox_pending_idx").on(table.publishedAt, table.occurredAt)],
);

export const inboxEvents = pgTable(
  "inbox_events",
  {
    consumer: varchar("consumer", { length: 120 }).notNull(),
    eventId: uuid("event_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    result: jsonb("result"),
  },
  (table) => [primaryKey({ columns: [table.consumer, table.eventId] })],
);

export const jobRuns = pgTable("job_runs", {
  id: identity(),
  publicId: publicId(),
  workspaceId: bigint("workspace_id", { mode: "bigint" }).references(() => workspaces.id),
  jobName: varchar("job_name", { length: 120 }).notNull(),
  jobVersion: integer("job_version").notNull(),
  executionKey: varchar("execution_key", { length: 200 }).notNull().unique(),
  status: jobStatus("status").notNull().default("PENDING"),
  payload: jsonb("payload").notNull(),
  progress: jsonb("progress"),
  attempts: integer("attempts").notNull().default(0),
  errorCode: varchar("error_code", { length: 100 }),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
