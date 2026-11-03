export type MaintenanceWorkspace = Readonly<{
  id: bigint;
  timezone: string;
}>;

export interface IMaintenanceRepository {
  listWorkspaces(): Promise<readonly MaintenanceWorkspace[]>;
}
