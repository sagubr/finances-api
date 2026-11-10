import { ConfirmTransactionUseCase } from "#/modules/transactions/application/use-cases/confirm-transaction.use-case.js";
import { CreateTransactionUseCase } from "#/modules/transactions/application/use-cases/create-transaction.use-case.js";
import { CreateTransferUseCase } from "#/modules/transactions/application/use-cases/create-transfer.use-case.js";
import { DeleteTransactionUseCase } from "#/modules/transactions/application/use-cases/delete-transaction.use-case.js";
import { GetMonthlySummaryUseCase } from "#/modules/transactions/application/use-cases/get-monthly-summary.use-case.js";
import { GetTransactionMapUseCase } from "#/modules/transactions/application/use-cases/get-transaction-map.use-case.js";
import { GetTransactionUseCase } from "#/modules/transactions/application/use-cases/get-transaction.use-case.js";
import { ListTransactionsUseCase } from "#/modules/transactions/application/use-cases/list-transactions.use-case.js";
import { RestoreTransactionUseCase } from "#/modules/transactions/application/use-cases/restore-transaction.use-case.js";
import { RevertTransactionStatusUseCase } from "#/modules/transactions/application/use-cases/revert-transaction-status.use-case.js";
import { SettleTransactionUseCase } from "#/modules/transactions/application/use-cases/settle-transaction.use-case.js";
import { UpdateTransactionUseCase } from "#/modules/transactions/application/use-cases/update-transaction.use-case.js";
import {
  ConfirmTransactionController,
  CreateTransactionController,
  CreateTransferController,
  DeleteTransactionController,
  GetMonthlySummaryController,
  GetTransactionController,
  GetTransactionMapController,
  ListTransactionsController,
  RestoreTransactionController,
  RevertTransactionStatusController,
  SettleTransactionController,
  UpdateTransactionController,
} from "#/modules/transactions/presentation/controllers/transaction.controller.js";
import { transactionsUnitOfWork } from "#/modules/transactions/providers/transactions-unit-of-work.provider.js";
import { v7 as uuidv7 } from "uuid";

export const transactionControllers = {
  list: new ListTransactionsController(new ListTransactionsUseCase(transactionsUnitOfWork)),
  map: new GetTransactionMapController(new GetTransactionMapUseCase(transactionsUnitOfWork)),
  get: new GetTransactionController(new GetTransactionUseCase(transactionsUnitOfWork)),
  create: new CreateTransactionController(
    new CreateTransactionUseCase(transactionsUnitOfWork, uuidv7),
  ),
  update: new UpdateTransactionController(new UpdateTransactionUseCase(transactionsUnitOfWork)),
  confirm: new ConfirmTransactionController(new ConfirmTransactionUseCase(transactionsUnitOfWork)),
  settle: new SettleTransactionController(new SettleTransactionUseCase(transactionsUnitOfWork)),
  revertStatus: new RevertTransactionStatusController(
    new RevertTransactionStatusUseCase(transactionsUnitOfWork),
  ),
  remove: new DeleteTransactionController(new DeleteTransactionUseCase(transactionsUnitOfWork)),
  restore: new RestoreTransactionController(new RestoreTransactionUseCase(transactionsUnitOfWork)),
  transfer: new CreateTransferController(new CreateTransferUseCase(transactionsUnitOfWork, uuidv7)),
  monthlySummary: new GetMonthlySummaryController(
    new GetMonthlySummaryUseCase(transactionsUnitOfWork),
  ),
} as const;
