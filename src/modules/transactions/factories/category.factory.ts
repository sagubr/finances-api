import { CreateCategoryUseCase } from "#/modules/transactions/application/use-cases/create-category.use-case.js";
import { DeleteCategoryUseCase } from "#/modules/transactions/application/use-cases/delete-category.use-case.js";
import { ListCategoriesUseCase } from "#/modules/transactions/application/use-cases/list-categories.use-case.js";
import { UpdateCategoryUseCase } from "#/modules/transactions/application/use-cases/update-category.use-case.js";
import {
  CreateCategoryController,
  DeleteCategoryController,
  ListCategoriesController,
  UpdateCategoryController,
} from "#/modules/transactions/presentation/controllers/category.controller.js";
import { transactionsUnitOfWork } from "#/modules/transactions/providers/transactions-unit-of-work.provider.js";
import { v7 as uuidv7 } from "uuid";

const listCategoriesUseCase = new ListCategoriesUseCase(transactionsUnitOfWork);
const createCategoryUseCase = new CreateCategoryUseCase(transactionsUnitOfWork, uuidv7);

export const categoryControllers = {
  list: new ListCategoriesController(listCategoriesUseCase),
  create: new CreateCategoryController(createCategoryUseCase),
  update: new UpdateCategoryController(new UpdateCategoryUseCase(transactionsUnitOfWork)),
  delete: new DeleteCategoryController(new DeleteCategoryUseCase(transactionsUnitOfWork)),
} as const;
