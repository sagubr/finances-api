import { env, type Environment } from "#/config/env.config.js";

export type StorageConfig = Readonly<{
  importStorageDir: string;
  exportStorageDir: string;
}>;

export const createStorageConfig = (value: Environment): StorageConfig => {
  return {
    importStorageDir: value.IMPORT_STORAGE_DIR,
    exportStorageDir: value.EXPORT_STORAGE_DIR,
  };
};

export const storageConfig = createStorageConfig(env);
