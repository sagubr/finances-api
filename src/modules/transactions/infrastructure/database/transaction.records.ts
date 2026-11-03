import type {
  accounts,
  categories,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";

type AccountRow = typeof accounts.$inferSelect;

export type AccountRecord = Readonly<
  Pick<
    AccountRow,
    | "publicId"
    | "name"
    | "type"
    | "currency"
    | "openingBalanceCents"
    | "openingBalanceOn"
    | "active"
    | "version"
  >
> & {
  currentBalanceCents?: bigint | string;
  projectedBalanceCents?: bigint | string;
};

type CategoryRow = typeof categories.$inferSelect;

export type CategoryRecord = Readonly<
  Pick<CategoryRow, "publicId" | "name" | "type" | "color" | "isDefault" | "active" | "version">
>;
