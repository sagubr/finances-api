import type { Database } from "#/infrastructure/database/db.provider.js";
import type {
  IMaintenanceRepository,
  MaintenanceWorkspace,
} from "#/modules/platform/application/ports/maintenance.repository.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import { isNull } from "drizzle-orm";

export class MaintenanceRepository implements IMaintenanceRepository {
  constructor(private readonly database: Database) {}

  listWorkspaces(): Promise<readonly MaintenanceWorkspace[]> {
    return this.database
      .select({ id: workspaces.id, timezone: workspaces.timezone })
      .from(workspaces)
      .where(isNull(workspaces.deletedAt));
  }
}
