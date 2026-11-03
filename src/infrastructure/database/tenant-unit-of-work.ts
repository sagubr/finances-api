import type { Database } from "#/infrastructure/database/db.provider.js";
import { sql } from "drizzle-orm";

export type TenantDatabase = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type TenantContext = Readonly<{
  workspaceId: bigint;
  actorId?: bigint;
}>;

export type TenantWork<T> = (database: TenantDatabase) => Promise<T>;

const setTenantContext = async (
  database: TenantDatabase,
  context: TenantContext,
): Promise<void> => {
  await database.execute(
    sql`select set_config('app.workspace_id', ${context.workspaceId.toString()}, true)`,
  );

  if (context.actorId === undefined) return;

  await database.execute(
    sql`select set_config('app.actor_id', ${context.actorId.toString()}, true)`,
  );
};

export class TenantUnitOfWork {
  constructor(private readonly database: Database) {}

  async run<T>(context: TenantContext, work: TenantWork<T>): Promise<T> {
    return this.database.transaction(async (transaction) => {
      await setTenantContext(transaction, context);
      return work(transaction);
    });
  }
}
