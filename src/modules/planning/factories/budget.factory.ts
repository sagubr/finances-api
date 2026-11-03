import { db } from "#/infrastructure/database/db.provider.js";
import { CopyBudgetsUseCase } from "#/modules/planning/application/use-cases/copy-budgets.use-case.js";
import { CreateBudgetUseCase } from "#/modules/planning/application/use-cases/create-budget.use-case.js";
import { DeleteBudgetUseCase } from "#/modules/planning/application/use-cases/delete-budget.use-case.js";
import { GetBudgetProgressUseCase } from "#/modules/planning/application/use-cases/get-budget-progress.use-case.js";
import { ListBudgetsUseCase } from "#/modules/planning/application/use-cases/list-budgets.use-case.js";
import { UpdateBudgetUseCase } from "#/modules/planning/application/use-cases/update-budget.use-case.js";
import { PlanningUnitOfWork } from "#/modules/planning/infrastructure/database/planning.unit-of-work.js";
import {
  CopyBudgetsController,
  CreateBudgetController,
  DeleteBudgetController,
  GetBudgetProgressController,
  ListBudgetsController,
  UpdateBudgetController,
} from "#/modules/planning/presentation/controllers/budget.controller.js";
import { v7 as uuidv7 } from "uuid";
const unitOfWork = new PlanningUnitOfWork(db);
export const budgetControllers = {
  list: new ListBudgetsController(new ListBudgetsUseCase(unitOfWork)),
  create: new CreateBudgetController(new CreateBudgetUseCase(unitOfWork, uuidv7)),
  update: new UpdateBudgetController(new UpdateBudgetUseCase(unitOfWork)),
  remove: new DeleteBudgetController(new DeleteBudgetUseCase(unitOfWork)),
  copy: new CopyBudgetsController(new CopyBudgetsUseCase(unitOfWork, uuidv7)),
  progress: new GetBudgetProgressController(new GetBudgetProgressUseCase(unitOfWork)),
} as const;
