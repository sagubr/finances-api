import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export class ImportStorage implements IImportStorage {
  constructor(private readonly rootDirectory: string) {}

  async write(workspacePublicId: string, batchId: string, buffer: Buffer): Promise<string> {
    const root = path.resolve(this.rootDirectory);
    const targetDirectory = path.resolve(root, workspacePublicId);
    const destination = path.resolve(targetDirectory, batchId);
    if (!destination.startsWith(`${root}${path.sep}`))
      throw new Error("Import storage key escapes its configured directory.");
    await mkdir(targetDirectory, { recursive: true, mode: 0o700 });
    await writeFile(destination, buffer, { mode: 0o600, flag: "wx" });
    return `${workspacePublicId}/${batchId}`;
  }
}
