export type Category = Readonly<{
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string | null;
  isDefault: boolean;
  active: boolean;
  version: number;
}>;
