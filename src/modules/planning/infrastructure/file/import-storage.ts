import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import { mkdir, unlink, writeFile } from "node:fs/promises";
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

  async remove(storageKey: string): Promise<void> {
    const destination = this.resolve(storageKey);
    try {
      await unlink(destination);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
        return;
      throw error;
    }
  }

  private resolve(storageKey: string): string {
    const root = path.resolve(this.rootDirectory);
    const destination = path.resolve(root, storageKey);
    if (!destination.startsWith(`${root}${path.sep}`))
      throw new Error("Import storage key escapes its configured directory.");
    return destination;
  }
}
