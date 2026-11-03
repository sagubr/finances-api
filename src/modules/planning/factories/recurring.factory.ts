import { db } from "#/infrastructure/database/db.provider.js";
import { CreateRecurringRuleUseCase } from "#/modules/planning/application/use-cases/create-recurring-rule.use-case.js";
import { DeleteRecurringRuleUseCase } from "#/modules/planning/application/use-cases/delete-recurring-rule.use-case.js";
import { ListRecurringRulesUseCase } from "#/modules/planning/application/use-cases/list-recurring-rules.use-case.js";
import { PauseRecurringRuleUseCase } from "#/modules/planning/application/use-cases/pause-recurring-rule.use-case.js";
import { ResumeRecurringRuleUseCase } from "#/modules/planning/application/use-cases/resume-recurring-rule.use-case.js";
import { UpdateRecurringRuleUseCase } from "#/modules/planning/application/use-cases/update-recurring-rule.use-case.js";
import { PlanningUnitOfWork } from "#/modules/planning/infrastructure/database/planning.unit-of-work.js";
import {
  CreateRecurringRuleController,
  DeleteRecurringRuleController,
  ListRecurringRulesController,
  PauseRecurringRuleController,
  ResumeRecurringRuleController,
  UpdateRecurringRuleController,
} from "#/modules/planning/presentation/controllers/recurring.controller.js";
import { v7 as uuidv7 } from "uuid";

const unitOfWork = new PlanningUnitOfWork(db);
export const recurringControllers = {
  list: new ListRecurringRulesController(new ListRecurringRulesUseCase(unitOfWork)),
  create: new CreateRecurringRuleController(new CreateRecurringRuleUseCase(unitOfWork, uuidv7)),
  pause: new PauseRecurringRuleController(new PauseRecurringRuleUseCase(unitOfWork)),
  resume: new ResumeRecurringRuleController(new ResumeRecurringRuleUseCase(unitOfWork)),
  update: new UpdateRecurringRuleController(new UpdateRecurringRuleUseCase(unitOfWork)),
  remove: new DeleteRecurringRuleController(new DeleteRecurringRuleUseCase(unitOfWork)),
} as const;
