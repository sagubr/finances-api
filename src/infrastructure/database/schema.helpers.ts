import { sql } from "drizzle-orm";
import { bigint, index, pgPolicy, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

export const identity = () =>
  bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity();

export const publicId = () => uuid("public_id").notNull().unique();

export const workspaceId = (reference: () => AnyPgColumn) =>
  bigint("workspace_id", { mode: "bigint" }).notNull().references(reference);

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const tenantPolicy = (tableName: string, column: AnyPgColumn) =>
  pgPolicy(`${tableName}_workspace_policy`, {
    for: "all",
    to: "public",
    using: sql`${column} = nullif(current_setting('app.workspace_id', true), '')::bigint`,
    withCheck: sql`${column} = nullif(current_setting('app.workspace_id', true), '')::bigint`,
  });

export const tenantIndex = (tableName: string, column: AnyPgColumn) =>
  index(`${tableName}_workspace_idx`).on(column);
