import { db } from "#/infrastructure/database/db.provider.js";
import { TransactionsUnitOfWork } from "#/modules/transactions/infrastructure/database/transactions.unit-of-work.js";

export const transactionsUnitOfWork = new TransactionsUnitOfWork(db);
