import { db } from "#/infrastructure/database/db.provider.js";
import { CreateWishlistItemUseCase } from "#/modules/operations/application/use-cases/create-wishlist-item.use-case.js";
import { DeleteWishlistItemUseCase } from "#/modules/operations/application/use-cases/delete-wishlist-item.use-case.js";
import { GetWishlistSummaryUseCase } from "#/modules/operations/application/use-cases/get-wishlist-summary.use-case.js";
import { ListWishlistUseCase } from "#/modules/operations/application/use-cases/list-wishlist.use-case.js";
import { PurchaseWishlistItemUseCase } from "#/modules/operations/application/use-cases/purchase-wishlist-item.use-case.js";
import { UpdateWishlistItemUseCase } from "#/modules/operations/application/use-cases/update-wishlist-item.use-case.js";
import { OperationsUnitOfWork } from "#/modules/operations/infrastructure/database/operations.unit-of-work.js";
import {
  CreateWishlistItemController,
  DeleteWishlistItemController,
  GetWishlistSummaryController,
  ListWishlistController,
  PurchaseWishlistItemController,
  UpdateWishlistItemController,
} from "#/modules/operations/presentation/controllers/wishlist-notification.controller.js";
import { v7 as uuidv7 } from "uuid";

const unitOfWork = new OperationsUnitOfWork(db);

export const wishlistControllers = {
  list: new ListWishlistController(new ListWishlistUseCase(unitOfWork)),
  summary: new GetWishlistSummaryController(new GetWishlistSummaryUseCase(unitOfWork)),
  create: new CreateWishlistItemController(new CreateWishlistItemUseCase(unitOfWork, uuidv7)),
  update: new UpdateWishlistItemController(new UpdateWishlistItemUseCase(unitOfWork)),
  archive: new DeleteWishlistItemController(new DeleteWishlistItemUseCase(unitOfWork)),
  purchase: new PurchaseWishlistItemController(new PurchaseWishlistItemUseCase(unitOfWork, uuidv7)),
} as const;
