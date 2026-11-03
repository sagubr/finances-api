import { databaseConfig } from "#/config/database.config.js";
import * as schema from "#/infrastructure/database/schema.js";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type Database = NodePgDatabase<typeof schema>;

export const pool = new Pool(databaseConfig.poolConfig);
export const db: Database = drizzle(pool, { schema });
export const closeDatabase = (): Promise<void> => pool.end();
