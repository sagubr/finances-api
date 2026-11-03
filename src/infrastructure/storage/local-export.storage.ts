import type { IExportStorage } from "#/modules/reports/application/ports/export-storage.js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class LocalExportStorage implements IExportStorage {
  constructor(private readonly directory: string) {}

  async write(storageKey: string, content: string) {
    const destination = this.resolve(storageKey);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, content, { encoding: "utf8", mode: 0o600, flag: "w" });
    return {
      storageKey,
      checksum: createHash("sha256").update(content).digest("hex"),
    };
  }

  read(storageKey: string): Promise<string> {
    return readFile(this.resolve(storageKey), "utf8");
  }

  private resolve(storageKey: string): string {
    const root = path.resolve(this.directory);
    const destination = path.resolve(root, storageKey);
    if (!destination.startsWith(`${root}${path.sep}`))
      throw new Error("Export storage key escapes its configured directory.");
    return destination;
  }
}
