import {
  identity,
  publicId,
  tenantIndex,
  tenantPolicy,
  timestamps,
} from "#/infrastructure/database/schema.helpers.js";
import { users, workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const exportStatus = pgEnum("export_status", [
  "PENDING",
  "RUNNING",
  "READY",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
]);
export const exportFormat = pgEnum("export_format", ["CSV", "XLSX", "PDF", "JSON"]);

export const exports = pgTable(
  "exports",
  {
    id: identity(),
    publicId: publicId(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    requestedBy: bigint("requested_by", { mode: "bigint" })
      .notNull()
      .references(() => users.id),
    report: varchar("report", { length: 100 }).notNull(),
    format: exportFormat("format").notNull(),
    status: exportStatus("status").notNull().default("PENDING"),
    filters: jsonb("filters").notNull().default({}),
    progress: integer("progress").notNull().default(0),
    storageKey: text("storage_key"),
    checksum: varchar("checksum", { length: 64 }),
    errorCode: varchar("error_code", { length: 100 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    tenantIndex("exports", table.workspaceId),
    tenantPolicy("exports", table.workspaceId),
  ],
).enableRLS();

export const exportDownloadTokens = pgTable(
  "export_download_tokens",
  {
    id: identity(),
    workspaceId: bigint("workspace_id", { mode: "bigint" })
      .notNull()
      .references(() => workspaces.id),
    exportId: bigint("export_id", { mode: "bigint" })
      .notNull()
      .references(() => exports.id),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    tenantIndex("export_download_tokens", table.workspaceId),
    tenantPolicy("export_download_tokens", table.workspaceId),
  ],
).enableRLS();
