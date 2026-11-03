export interface IImportStorage {
  write(workspacePublicId: string, batchId: string, buffer: Buffer): Promise<string>;
}
