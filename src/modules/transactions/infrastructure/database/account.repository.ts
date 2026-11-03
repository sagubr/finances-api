import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import type { IAccountRepository } from "#/modules/transactions/application/ports/account.repository.js";
import type { AccountPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import {
  accounts,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { mapAccount } from "#/modules/transactions/mappers/transaction.mapper.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import {
  createCursorPage,
  decodeCursor,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";

const accountSelection = {
  publicId: accounts.publicId,
  name: accounts.name,
  type: accounts.type,
  currency: accounts.currency,
  openingBalanceCents: accounts.openingBalanceCents,
  openingBalanceOn: accounts.openingBalanceOn,
  active: accounts.active,
  version: accounts.version,
} as const;

export class AccountRepository implements IAccountRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
  ) {}

  async list(query: CursorPaginationQuery) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({ internalId: accounts.id, ...accountSelection })
      .from(accounts)
      .where(
        and(
          eq(accounts.workspaceId, this.workspaceId),
          isNull(accounts.deletedAt),
          ...(cursor ? [lt(accounts.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(accounts.publicId))
      .limit(query.limit + 1);

    const balances = await this.listBalanceDeltas(rows.map((account) => account.internalId));

    return createCursorPage(
      rows.map((account) => {
        const balance = balances.get(account.internalId) ?? { current: 0n, projected: 0n };
        return mapAccount({
          ...account,
          currentBalanceCents: account.openingBalanceCents + balance.current,
          projectedBalanceCents: account.openingBalanceCents + balance.projected,
        });
      }),
      query.limit,
    );
  }

  async create(
    publicId: string,
    actorId: bigint,
    input: Parameters<IAccountRepository["create"]>[2],
  ) {
    await this.requireWorkspaceCurrency(input.currency);
    const rows = await this.database
      .insert(accounts)
      .values({
        publicId,
        workspaceId: this.workspaceId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        openingBalanceCents: BigInt(input.openingBalanceCents),
        openingBalanceOn: input.openingBalanceOn,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning(accountSelection);

    const account = rows[0];
    if (!account) throw new Error("Account insert did not return a record.");
    return mapAccount(account);
  }

  private async requireWorkspaceCurrency(currency: string): Promise<void> {
    const workspace = (
      await this.database
        .select({ baseCurrency: workspaces.baseCurrency })
        .from(workspaces)
        .where(eq(workspaces.id, this.workspaceId))
        .limit(1)
    )[0];
    if (workspace?.baseCurrency === currency) return;
    throw new ApplicationError("A moeda da conta deve ser a moeda-base do workspace.", {
      category: "validation",
      code: "ACCOUNT_CURRENCY_NOT_BASE",
      details: workspace ? { baseCurrency: workspace.baseCurrency } : undefined,
    });
  }

  async update(publicId: string, actorId: bigint, input: AccountPatch) {
    const current = (
      await this.database
        .select({ type: accounts.type, currency: accounts.currency })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, this.workspaceId),
            eq(accounts.publicId, publicId),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!current) return null;
    if (input.type !== undefined && input.type !== current.type)
      throw new ApplicationError("O tipo da conta não pode ser alterado após o cadastro.", {
        category: "validation",
        code: "ACCOUNT_TYPE_IMMUTABLE",
      });
    if (input.currency !== undefined && input.currency !== current.currency)
      throw new ApplicationError("A moeda da conta não pode ser alterada após o cadastro.", {
        category: "validation",
        code: "ACCOUNT_CURRENCY_IMMUTABLE",
      });
    const rows = await this.database
      .update(accounts)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.openingBalanceCents === undefined
          ? {}
          : { openingBalanceCents: BigInt(input.openingBalanceCents) }),
        ...(input.openingBalanceOn === undefined
          ? {}
          : { openingBalanceOn: input.openingBalanceOn }),
        updatedBy: actorId,
        updatedAt: new Date(),
        version: sql`${accounts.version} + 1`,
      })
      .where(
        and(
          eq(accounts.workspaceId, this.workspaceId),
          eq(accounts.publicId, publicId),
          eq(accounts.version, input.expectedVersion),
          isNull(accounts.deletedAt),
        ),
      )
      .returning({ internalId: accounts.id, ...accountSelection });

    const account = rows[0];
    if (!account) return null;
    const balance = (await this.listBalanceDeltas([account.internalId])).get(
      account.internalId,
    ) ?? {
      current: 0n,
      projected: 0n,
    };
    return mapAccount({
      ...account,
      currentBalanceCents: account.openingBalanceCents + balance.current,
      projectedBalanceCents: account.openingBalanceCents + balance.projected,
    });
  }

  async softDelete(publicId: string, expectedVersion: number): Promise<boolean> {
    const rows = await this.database
      .update(accounts)
      .set({
        active: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${accounts.version} + 1`,
      })
      .where(
        and(
          eq(accounts.workspaceId, this.workspaceId),
          eq(accounts.publicId, publicId),
          eq(accounts.version, expectedVersion),
          isNull(accounts.deletedAt),
        ),
      )
      .returning({ id: accounts.id });

    return rows.length === 1;
  }

  private async listBalanceDeltas(accountIds: readonly bigint[]) {
    if (accountIds.length === 0)
      return new Map<bigint, Readonly<{ current: bigint; projected: bigint }>>();

    const movement = sql`
      case
        when ${transactions.type} = 'INCOME' then ${transactions.amountCents}
        when ${transactions.type} in ('EXPENSE', 'CARD_PAYMENT')
          and not exists (
            select 1 from statement_cycles statement_cycle
            where statement_cycle.transaction_id = ${transactions.id}
          )
          then -${transactions.amountCents}
        when ${transactions.type} = 'TRANSFER'
          and exists (
            select 1 from transfer_pairs debit_pair
            where debit_pair.debit_transaction_id = ${transactions.id}
          )
          then -${transactions.amountCents}
        when ${transactions.type} = 'TRANSFER'
          and exists (
            select 1 from transfer_pairs credit_pair
            where credit_pair.credit_transaction_id = ${transactions.id}
          )
          then ${transactions.amountCents}
        else 0
      end
    `;
    const rows = await this.database
      .select({
        accountId: transactions.accountId,
        current: sql<string>`coalesce(sum(
          case
            when ${transactions.status} = 'SETTLED'
              and ${transactions.occurredOn} <= timezone(${workspaces.timezone}, current_timestamp)::date
              then ${movement}
            else 0
          end
        ), 0)`,
        projected: sql<string>`coalesce(sum(${movement}), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .innerJoin(workspaces, eq(workspaces.id, accounts.workspaceId))
      .where(
        and(
          eq(transactions.workspaceId, this.workspaceId),
          inArray(transactions.accountId, [...accountIds]),
          isNull(transactions.deletedAt),
          gte(transactions.occurredOn, accounts.openingBalanceOn),
        ),
      )
      .groupBy(transactions.accountId);

    return new Map(
      rows.map((row) => [
        row.accountId,
        { current: BigInt(row.current), projected: BigInt(row.projected) },
      ]),
    );
  }
}
