export interface IExportStorage {
  write(
    storageKey: string,
    content: string,
  ): Promise<Readonly<{ storageKey: string; checksum: string }>>;
  read(storageKey: string): Promise<string>;
}
