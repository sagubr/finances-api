import { CreateAccountUseCase } from "#/modules/transactions/application/use-cases/create-account.use-case.js";
import { DeleteAccountUseCase } from "#/modules/transactions/application/use-cases/delete-account.use-case.js";
import { ListAccountsUseCase } from "#/modules/transactions/application/use-cases/list-accounts.use-case.js";
import { UpdateAccountUseCase } from "#/modules/transactions/application/use-cases/update-account.use-case.js";
import {
  CreateAccountController,
  DeleteAccountController,
  ListAccountsController,
  UpdateAccountController,
} from "#/modules/transactions/presentation/controllers/account.controller.js";
import { transactionsUnitOfWork } from "#/modules/transactions/providers/transactions-unit-of-work.provider.js";
import { v7 as uuidv7 } from "uuid";

const listAccountsUseCase = new ListAccountsUseCase(transactionsUnitOfWork);
const createAccountUseCase = new CreateAccountUseCase(transactionsUnitOfWork, uuidv7);
const updateAccountUseCase = new UpdateAccountUseCase(transactionsUnitOfWork);
const deleteAccountUseCase = new DeleteAccountUseCase(transactionsUnitOfWork);

export const accountControllers = {
  list: new ListAccountsController(listAccountsUseCase),
  create: new CreateAccountController(createAccountUseCase),
  update: new UpdateAccountController(updateAccountUseCase),
  remove: new DeleteAccountController(deleteAccountUseCase),
} as const;
