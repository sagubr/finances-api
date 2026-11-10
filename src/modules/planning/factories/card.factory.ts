import { db } from "#/infrastructure/database/db.provider.js";
import { CloseCardStatementUseCase } from "#/modules/planning/application/use-cases/close-card-statement.use-case.js";
import { CreateCardPurchaseUseCase } from "#/modules/planning/application/use-cases/create-card-purchase.use-case.js";
import { CreateCreditCardUseCase } from "#/modules/planning/application/use-cases/create-credit-card.use-case.js";
import { DeleteCardPurchaseUseCase } from "#/modules/planning/application/use-cases/delete-card-purchase.use-case.js";
import { DeleteCreditCardUseCase } from "#/modules/planning/application/use-cases/delete-credit-card.use-case.js";
import { GetCardStatementUseCase } from "#/modules/planning/application/use-cases/get-card-statement.use-case.js";
import { ListCardStatementsUseCase } from "#/modules/planning/application/use-cases/list-card-statements.use-case.js";
import { ListCreditCardsUseCase } from "#/modules/planning/application/use-cases/list-credit-cards.use-case.js";
import { PayCardStatementUseCase } from "#/modules/planning/application/use-cases/pay-card-statement.use-case.js";
import { ReopenCardStatementUseCase } from "#/modules/planning/application/use-cases/reopen-card-statement.use-case.js";
import { UpdateCardPurchaseUseCase } from "#/modules/planning/application/use-cases/update-card-purchase.use-case.js";
import { UpdateCreditCardUseCase } from "#/modules/planning/application/use-cases/update-credit-card.use-case.js";
import { PlanningUnitOfWork } from "#/modules/planning/infrastructure/database/planning.unit-of-work.js";
import {
  CloseCardStatementController,
  CreateCardPurchaseController,
  CreateCreditCardController,
  DeleteCardPurchaseController,
  DeleteCreditCardController,
  GetCardStatementController,
  ListCardStatementsController,
  ListCreditCardsController,
  PayCardStatementController,
  ReopenCardStatementController,
  UpdateCardPurchaseController,
  UpdateCreditCardController,
} from "#/modules/planning/presentation/controllers/card.controller.js";
import { v7 as uuidv7 } from "uuid";
const unitOfWork = new PlanningUnitOfWork(db);
export const cardControllers = {
  list: new ListCreditCardsController(new ListCreditCardsUseCase(unitOfWork)),
  create: new CreateCreditCardController(new CreateCreditCardUseCase(unitOfWork, uuidv7)),
  update: new UpdateCreditCardController(new UpdateCreditCardUseCase(unitOfWork)),
  delete: new DeleteCreditCardController(new DeleteCreditCardUseCase(unitOfWork)),
  purchase: new CreateCardPurchaseController(new CreateCardPurchaseUseCase(unitOfWork, uuidv7)),
  updatePurchase: new UpdateCardPurchaseController(new UpdateCardPurchaseUseCase(unitOfWork)),
  deletePurchase: new DeleteCardPurchaseController(new DeleteCardPurchaseUseCase(unitOfWork)),
  listStatements: new ListCardStatementsController(new ListCardStatementsUseCase(unitOfWork)),
  getStatement: new GetCardStatementController(new GetCardStatementUseCase(unitOfWork)),
  closeStatement: new CloseCardStatementController(new CloseCardStatementUseCase(unitOfWork)),
  reopenStatement: new ReopenCardStatementController(new ReopenCardStatementUseCase(unitOfWork)),
  payStatement: new PayCardStatementController(new PayCardStatementUseCase(unitOfWork, uuidv7)),
} as const;
