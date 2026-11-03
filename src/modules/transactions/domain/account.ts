export type Account = Readonly<{
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CASH" | "BROKERAGE" | "BENEFIT" | "OTHER";
  currency: string;
  openingBalanceCents: number;
  openingBalanceOn: string;
  currentBalanceCents: number;
  projectedBalanceCents: number;
  active: boolean;
  version: number;
}>;
