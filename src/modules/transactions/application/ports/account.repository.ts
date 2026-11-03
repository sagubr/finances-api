import type { Account } from "#/modules/transactions/domain/account.js";
import type { AccountInput, AccountPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";

export interface IAccountRepository {
  list(query: CursorPaginationQuery): Promise<CursorPage<Account>>;
  create(publicId: string, actorId: bigint, input: AccountInput): Promise<Account>;
  update(publicId: string, actorId: bigint, input: AccountPatch): Promise<Account | null>;
  softDelete(publicId: string, expectedVersion: number): Promise<boolean>;
}
