import { authConfig } from "#/config/auth.config.js";
import { storageConfig } from "#/config/storage.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { AesGcmContentCipher } from "#/infrastructure/security/content-cipher.js";
import { LocalExportStorage } from "#/infrastructure/storage/local-export.storage.js";
import { CancelDeletionUseCase } from "#/modules/operations/application/use-cases/cancel-deletion.use-case.js";
import { CreateActivityUseCase } from "#/modules/operations/application/use-cases/create-activity.use-case.js";
import { CreateConsentUseCase } from "#/modules/operations/application/use-cases/create-consent.use-case.js";
import { CreateGoalCheckinUseCase } from "#/modules/operations/application/use-cases/create-goal-checkin.use-case.js";
import { CreateGoalUseCase } from "#/modules/operations/application/use-cases/create-goal.use-case.js";
import { CreatePrivacyDownloadTokenUseCase } from "#/modules/operations/application/use-cases/create-privacy-download-token.use-case.js";
import { CreateWishlistItemUseCase } from "#/modules/operations/application/use-cases/create-wishlist-item.use-case.js";
import { DeleteActivityUseCase } from "#/modules/operations/application/use-cases/delete-activity.use-case.js";
import { DeleteGoalUseCase } from "#/modules/operations/application/use-cases/delete-goal.use-case.js";
import { DeleteWishlistItemUseCase } from "#/modules/operations/application/use-cases/delete-wishlist-item.use-case.js";
import { DownloadPrivacyExportUseCase } from "#/modules/operations/application/use-cases/download-privacy-export.use-case.js";
import { GetBillingUsageUseCase } from "#/modules/operations/application/use-cases/get-billing-usage.use-case.js";
import { GetGoalProgressUseCase } from "#/modules/operations/application/use-cases/get-goal-progress.use-case.js";
import { GetPlannerWeekUseCase } from "#/modules/operations/application/use-cases/get-planner-week.use-case.js";
import { GetPrivacyExportUseCase } from "#/modules/operations/application/use-cases/get-privacy-export.use-case.js";
import { GetSubscriptionUseCase } from "#/modules/operations/application/use-cases/get-subscription.use-case.js";
import { ListActivitiesUseCase } from "#/modules/operations/application/use-cases/list-activities.use-case.js";
import { ListGoalsUseCase } from "#/modules/operations/application/use-cases/list-goals.use-case.js";
import { ListLegalDocumentsUseCase } from "#/modules/operations/application/use-cases/list-legal-documents.use-case.js";
import { ListNotificationsUseCase } from "#/modules/operations/application/use-cases/list-notifications.use-case.js";
import { ListPlansUseCase } from "#/modules/operations/application/use-cases/list-plans.use-case.js";
import { ListSensitiveAccessUseCase } from "#/modules/operations/application/use-cases/list-sensitive-access.use-case.js";
import { ListWishlistUseCase } from "#/modules/operations/application/use-cases/list-wishlist.use-case.js";
import { OpenBillingProviderUseCase } from "#/modules/operations/application/use-cases/open-billing-provider.use-case.js";
import { PurchaseWishlistItemUseCase } from "#/modules/operations/application/use-cases/purchase-wishlist-item.use-case.js";
import { ReadAllNotificationsUseCase } from "#/modules/operations/application/use-cases/read-all-notifications.use-case.js";
import { ReadNotificationUseCase } from "#/modules/operations/application/use-cases/read-notification.use-case.js";
import { RequestDeletionUseCase } from "#/modules/operations/application/use-cases/request-deletion.use-case.js";
import { RequestPrivacyExportUseCase } from "#/modules/operations/application/use-cases/request-privacy-export.use-case.js";
import { SavePlannerTemplateUseCase } from "#/modules/operations/application/use-cases/save-planner-template.use-case.js";
import { UpdateActivityUseCase } from "#/modules/operations/application/use-cases/update-activity.use-case.js";
import { UpdateGoalUseCase } from "#/modules/operations/application/use-cases/update-goal.use-case.js";
import { UpdateWishlistItemUseCase } from "#/modules/operations/application/use-cases/update-wishlist-item.use-case.js";
import { OperationsUnitOfWork } from "#/modules/operations/infrastructure/database/operations.unit-of-work.js";
import {
  CancelDeletionController,
  CreateConsentController,
  CreatePrivacyDownloadTokenController,
  DownloadPrivacyExportController,
  GetBillingUsageController,
  GetPrivacyExportController,
  GetSubscriptionController,
  ListLegalDocumentsController,
  ListPlansController,
  ListSensitiveAccessController,
  OpenBillingProviderController,
  RequestDeletionController,
  RequestPrivacyExportController,
} from "#/modules/operations/presentation/controllers/billing-privacy.controller.js";
import {
  CreateActivityController,
  CreateGoalCheckinController,
  CreateGoalController,
  DeleteActivityController,
  DeleteGoalController,
  GetGoalProgressController,
  GetPlannerWeekController,
  ListActivitiesController,
  ListGoalsController,
  SavePlannerTemplateController,
  UpdateActivityController,
  UpdateGoalController,
} from "#/modules/operations/presentation/controllers/planner-goal.controller.js";
import {
  CreateWishlistItemController,
  DeleteWishlistItemController,
  ListNotificationsController,
  ListWishlistController,
  PurchaseWishlistItemController,
  ReadAllNotificationsController,
  ReadNotificationController,
  UpdateWishlistItemController,
} from "#/modules/operations/presentation/controllers/wishlist-notification.controller.js";
import { v7 as uuidv7 } from "uuid";
const unitOfWork = new OperationsUnitOfWork(db);
const now = () => new Date();
const privacyStorage = new LocalExportStorage(storageConfig.exportStorageDir);
const privacyCipher = new AesGcmContentCipher(
  authConfig.tokenEncryptionKey ??
    authConfig.cookieSecret ??
    "finances-development-token-encryption-key",
);
export const operationsControllers = {
  activities: new ListActivitiesController(new ListActivitiesUseCase(unitOfWork)),
  createActivity: new CreateActivityController(new CreateActivityUseCase(unitOfWork, uuidv7)),
  updateActivity: new UpdateActivityController(new UpdateActivityUseCase(unitOfWork)),
  deleteActivity: new DeleteActivityController(new DeleteActivityUseCase(unitOfWork)),
  saveTemplate: new SavePlannerTemplateController(
    new SavePlannerTemplateUseCase(unitOfWork, uuidv7),
  ),
  week: new GetPlannerWeekController(new GetPlannerWeekUseCase(unitOfWork, now)),
  goals: new ListGoalsController(new ListGoalsUseCase(unitOfWork)),
  createGoal: new CreateGoalController(new CreateGoalUseCase(unitOfWork, uuidv7)),
  updateGoal: new UpdateGoalController(new UpdateGoalUseCase(unitOfWork)),
  deleteGoal: new DeleteGoalController(new DeleteGoalUseCase(unitOfWork)),
  createCheckin: new CreateGoalCheckinController(new CreateGoalCheckinUseCase(unitOfWork, uuidv7)),
  goalProgress: new GetGoalProgressController(new GetGoalProgressUseCase(unitOfWork, now)),
  wishlist: new ListWishlistController(new ListWishlistUseCase(unitOfWork)),
  createWishlist: new CreateWishlistItemController(
    new CreateWishlistItemUseCase(unitOfWork, uuidv7),
  ),
  updateWishlist: new UpdateWishlistItemController(new UpdateWishlistItemUseCase(unitOfWork)),
  deleteWishlist: new DeleteWishlistItemController(new DeleteWishlistItemUseCase(unitOfWork)),
  purchaseWishlist: new PurchaseWishlistItemController(
    new PurchaseWishlistItemUseCase(unitOfWork, uuidv7),
  ),
  notifications: new ListNotificationsController(new ListNotificationsUseCase(unitOfWork)),
  readAll: new ReadAllNotificationsController(new ReadAllNotificationsUseCase(unitOfWork)),
  readNotification: new ReadNotificationController(new ReadNotificationUseCase(unitOfWork)),
  plans: new ListPlansController(new ListPlansUseCase(unitOfWork)),
  subscription: new GetSubscriptionController(new GetSubscriptionUseCase(unitOfWork)),
  billingUsage: new GetBillingUsageController(new GetBillingUsageUseCase(unitOfWork)),
  billingProvider: new OpenBillingProviderController(new OpenBillingProviderUseCase()),
  legalDocuments: new ListLegalDocumentsController(new ListLegalDocumentsUseCase(unitOfWork)),
  createConsent: new CreateConsentController(new CreateConsentUseCase(unitOfWork, uuidv7, now)),
  privacyExport: new RequestPrivacyExportController(
    new RequestPrivacyExportUseCase(unitOfWork, uuidv7),
  ),
  privacyExportDetail: new GetPrivacyExportController(new GetPrivacyExportUseCase(unitOfWork)),
  privacyDownloadToken: new CreatePrivacyDownloadTokenController(
    new CreatePrivacyDownloadTokenUseCase(unitOfWork, now),
  ),
  privacyDownload: new DownloadPrivacyExportController(
    new DownloadPrivacyExportUseCase(unitOfWork, privacyStorage, privacyCipher, now),
  ),
  deletion: new RequestDeletionController(new RequestDeletionUseCase(unitOfWork, uuidv7, now)),
  cancelDeletion: new CancelDeletionController(new CancelDeletionUseCase(unitOfWork, now)),
  sensitiveAccess: new ListSensitiveAccessController(new ListSensitiveAccessUseCase(unitOfWork)),
} as const;
