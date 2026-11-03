import type { Account } from "#/modules/transactions/domain/account.js";
import type { Category } from "#/modules/transactions/domain/category.js";
import type {
  AccountRecord,
  CategoryRecord,
} from "#/modules/transactions/infrastructure/database/transaction.records.js";

const safeInteger = (value: bigint | string): number => {
  const result = Number(value);
  if (!Number.isSafeInteger(result))
    throw new Error("Persisted monetary value exceeds safe range.");
  return result;
};

export const mapAccount = (item: AccountRecord): Account => ({
  id: item.publicId,
  name: item.name,
  type: item.type,
  currency: item.currency,
  openingBalanceCents: safeInteger(item.openingBalanceCents),
  openingBalanceOn: item.openingBalanceOn,
  currentBalanceCents: safeInteger(item.currentBalanceCents ?? item.openingBalanceCents),
  projectedBalanceCents: safeInteger(item.projectedBalanceCents ?? item.openingBalanceCents),
  active: item.active,
  version: item.version,
});

export const mapCategory = (item: CategoryRecord): Category => ({
  id: item.publicId,
  name: item.name,
  type: item.type,
  color: item.color,
  isDefault: item.isDefault,
  active: item.active,
  version: item.version,
});
