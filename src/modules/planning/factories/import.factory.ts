import { storageConfig } from "#/config/storage.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { CommitImportUseCase } from "#/modules/planning/application/use-cases/commit-import.use-case.js";
import { CreateImportPreviewUseCase } from "#/modules/planning/application/use-cases/create-import-preview.use-case.js";
import { GetImportBatchUseCase } from "#/modules/planning/application/use-cases/get-import-batch.use-case.js";
import { ListImportRowsUseCase } from "#/modules/planning/application/use-cases/list-import-rows.use-case.js";
import { RollbackImportUseCase } from "#/modules/planning/application/use-cases/rollback-import.use-case.js";
import { UpdateImportRowUseCase } from "#/modules/planning/application/use-cases/update-import-row.use-case.js";
import { ImportUnitOfWork } from "#/modules/planning/infrastructure/database/import.unit-of-work.js";
import { ImportFileParser } from "#/modules/planning/infrastructure/file/import-file.parser.js";
import { ImportStorage } from "#/modules/planning/infrastructure/file/import-storage.js";
import {
  CommitImportController,
  CreateImportPreviewController,
  DownloadImportTemplateController,
  GetImportBatchController,
  ListImportRowsController,
  RollbackImportController,
  UpdateImportRowController,
} from "#/modules/planning/presentation/controllers/import.controller.js";
import { createHash } from "node:crypto";
import { v7 as uuidv7 } from "uuid";

const unitOfWork = new ImportUnitOfWork(db, storageConfig.importStorageQuotaBytes);
const parser = new ImportFileParser();
const storage = new ImportStorage(storageConfig.importStorageDir);
export const importControllers = {
  create: new CreateImportPreviewController(
    new CreateImportPreviewUseCase(unitOfWork, parser, storage, uuidv7, (buffer) =>
      createHash("sha256").update(buffer).digest("hex"),
    ),
  ),
  get: new GetImportBatchController(new GetImportBatchUseCase(unitOfWork)),
  listRows: new ListImportRowsController(new ListImportRowsUseCase(unitOfWork)),
  updateRow: new UpdateImportRowController(new UpdateImportRowUseCase(unitOfWork, parser)),
  commit: new CommitImportController(new CommitImportUseCase(unitOfWork, uuidv7)),
  rollback: new RollbackImportController(new RollbackImportUseCase(unitOfWork)),
  template: new DownloadImportTemplateController(),
} as const;
