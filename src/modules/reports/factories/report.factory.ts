import { storageConfig } from "#/config/storage.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { LocalExportStorage } from "#/infrastructure/storage/local-export.storage.js";
import { CompareReportUseCase } from "#/modules/reports/application/use-cases/compare-report.use-case.js";
import { CreateDownloadTokenUseCase } from "#/modules/reports/application/use-cases/create-download-token.use-case.js";
import { CreateExportUseCase } from "#/modules/reports/application/use-cases/create-export.use-case.js";
import { DownloadExportUseCase } from "#/modules/reports/application/use-cases/download-export.use-case.js";
import { GetAnnualReportUseCase } from "#/modules/reports/application/use-cases/get-annual-report.use-case.js";
import { GetCashflowForecastUseCase } from "#/modules/reports/application/use-cases/get-cashflow-forecast.use-case.js";
import { GetCategorySpendingUseCase } from "#/modules/reports/application/use-cases/get-category-spending.use-case.js";
import { GetExportUseCase } from "#/modules/reports/application/use-cases/get-export.use-case.js";
import { ReportUnitOfWork } from "#/modules/reports/infrastructure/database/report.unit-of-work.js";
import {
  CompareReportController,
  CreateDownloadTokenController,
  CreateExportController,
  DownloadExportController,
  GetAnnualReportController,
  GetCashflowForecastController,
  GetCategorySpendingController,
  GetExportController,
} from "#/modules/reports/presentation/controllers/report.controller.js";
import { v7 as uuidv7 } from "uuid";

const unitOfWork = new ReportUnitOfWork(db);
const storage = new LocalExportStorage(storageConfig.exportStorageDir);
const now = () => new Date();
export const reportControllers = {
  annual: new GetAnnualReportController(new GetAnnualReportUseCase(unitOfWork, now)),
  compare: new CompareReportController(new CompareReportUseCase(unitOfWork, now)),
  cashflow: new GetCashflowForecastController(new GetCashflowForecastUseCase(unitOfWork, now)),
  categorySpending: new GetCategorySpendingController(
    new GetCategorySpendingUseCase(unitOfWork, now),
  ),
  createExport: new CreateExportController(new CreateExportUseCase(unitOfWork, uuidv7)),
  getExport: new GetExportController(new GetExportUseCase(unitOfWork)),
  createDownloadToken: new CreateDownloadTokenController(
    new CreateDownloadTokenUseCase(unitOfWork, now),
  ),
  download: new DownloadExportController(new DownloadExportUseCase(unitOfWork, storage, now)),
} as const;
