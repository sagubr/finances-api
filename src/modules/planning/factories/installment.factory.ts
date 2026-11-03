import { db } from "#/infrastructure/database/db.provider.js";
import { CreateInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/create-installment-plan.use-case.js";
import { DeleteInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/delete-installment-plan.use-case.js";
import { ListInstallmentPlansUseCase } from "#/modules/planning/application/use-cases/list-installment-plans.use-case.js";
import { UpdateInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/update-installment-plan.use-case.js";
import { PlanningUnitOfWork } from "#/modules/planning/infrastructure/database/planning.unit-of-work.js";
import {
  CreateInstallmentPlanController,
  DeleteInstallmentPlanController,
  ListInstallmentPlansController,
  UpdateInstallmentPlanController,
} from "#/modules/planning/presentation/controllers/installment.controller.js";
import { v7 as uuidv7 } from "uuid";
const unitOfWork = new PlanningUnitOfWork(db);
export const installmentControllers = {
  list: new ListInstallmentPlansController(new ListInstallmentPlansUseCase(unitOfWork)),
  create: new CreateInstallmentPlanController(new CreateInstallmentPlanUseCase(unitOfWork, uuidv7)),
  update: new UpdateInstallmentPlanController(new UpdateInstallmentPlanUseCase(unitOfWork)),
  delete: new DeleteInstallmentPlanController(new DeleteInstallmentPlanUseCase(unitOfWork)),
} as const;
