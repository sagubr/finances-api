import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { jobRuns } from "#/modules/platform/infrastructure/database/platform.schema.js";
import type { IReportRepository } from "#/modules/reports/application/ports/report.repository.js";
import {
  exportSchema,
  type CompareReportQuery,
  type ExportInput,
} from "#/modules/reports/dtos/report.dto.js";
import {
  exportDownloadTokens,
  exports,
} from "#/modules/reports/infrastructure/database/reports.schema.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { and, asc, eq, gt, inArray, isNull, like, sql } from "drizzle-orm";

type AnnualRow = Readonly<{
  month: string;
  incomeCents: bigint;
  expenseCents: bigint;
  plannedIncomeCents: bigint;
  plannedExpenseCents: bigint;
}>;
const safeMoney = (value: bigint | string): number => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount))
    throw new Error("Persisted monetary value exceeds safe range.");
  return amount;
};
const variation = (value: number, base: number) =>
  base === 0
    ? { bps: null, reason: "NO_COMPARISON_BASE" as const }
    : { bps: Math.round(((value - base) * 10_000) / Math.abs(base)), reason: null };

export class ReportRepository implements IReportRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
  ) {}

  async annual(year: number, calculatedAt: string) {
    const rows: AnnualRow[] = await this.database
      .select({
        month: transactions.competenceMonth,
        incomeCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
        expenseCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
        plannedIncomeCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} = 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
        plannedExpenseCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} = 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          sql`${accounts.type} <> 'BENEFIT'`,
          isNull(transactions.deletedAt),
          like(transactions.competenceMonth, `${year}-%`),
        ),
      )
      .groupBy(transactions.competenceMonth)
      .orderBy(asc(transactions.competenceMonth));
    const byMonth = new Map(rows.map((row) => [row.month, row]));
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${(index + 1).toString().padStart(2, "0")}`;
      const row = byMonth.get(month);
      const incomeCents = safeMoney(row?.incomeCents ?? 0n);
      const expenseCents = safeMoney(row?.expenseCents ?? 0n);
      const plannedIncomeCents = safeMoney(row?.plannedIncomeCents ?? 0n);
      const plannedExpenseCents = safeMoney(row?.plannedExpenseCents ?? 0n);
      return {
        month,
        incomeCents,
        expenseCents,
        netCents: incomeCents - expenseCents,
        plannedIncomeCents,
        plannedExpenseCents,
        plannedNetCents: plannedIncomeCents - plannedExpenseCents,
      };
    });
    return {
      year,
      months,
      totals: months.reduce(
        (total, item) => ({
          incomeCents: total.incomeCents + item.incomeCents,
          expenseCents: total.expenseCents + item.expenseCents,
          netCents: total.netCents + item.netCents,
        }),
        { incomeCents: 0, expenseCents: 0, netCents: 0 },
      ),
      calculatedAt,
      dataVersion: 1,
    };
  }

  async compare(input: CompareReportQuery, calculatedAt: string) {
    const rows = await this.database
      .select({
        month: transactions.competenceMonth,
        incomeCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
        expenseCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          sql`${accounts.type} <> 'BENEFIT'`,
          isNull(transactions.deletedAt),
          inArray(transactions.competenceMonth, [input.current, input.previous]),
        ),
      )
      .groupBy(transactions.competenceMonth);
    const values = new Map(
      rows.map((row) => [
        row.month,
        { incomeCents: safeMoney(row.incomeCents), expenseCents: safeMoney(row.expenseCents) },
      ]),
    );
    const currentValue = values.get(input.current) ?? { incomeCents: 0, expenseCents: 0 };
    const previousValue = values.get(input.previous) ?? { incomeCents: 0, expenseCents: 0 };
    return {
      current: { month: input.current, ...currentValue },
      previous: { month: input.previous, ...previousValue },
      variation: {
        income: variation(currentValue.incomeCents, previousValue.incomeCents),
        expense: variation(currentValue.expenseCents, previousValue.expenseCents),
      },
      calculatedAt,
      dataVersion: 1,
    };
  }

  async cashflow(input: Parameters<IReportRepository["cashflow"]>[0], calculatedAt: string) {
    const rows = await this.database
      .select({
        date: transactions.occurredOn,
        incomeCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${accounts.type} not in ('BROKERAGE', 'BENEFIT') then ${transactions.amountCents} else 0 end), 0)`,
        expenseCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${accounts.type} not in ('BROKERAGE', 'BENEFIT') then ${transactions.amountCents} else 0 end), 0)`,
        investmentCents: sql<bigint>`coalesce(sum(case
          when ${transactions.type} = 'TRANSFER' and exists (
            select 1
            from transfer_pairs investment_pair
            inner join transactions investment_credit
              on investment_credit.id = investment_pair.credit_transaction_id
            inner join accounts investment_account
              on investment_account.id = investment_credit.account_id
            where investment_pair.debit_transaction_id = ${transactions.id}
              and investment_account.type = 'BROKERAGE'
          ) and ${accounts.type} not in ('BROKERAGE', 'BENEFIT') then ${transactions.amountCents}
          else 0
        end), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          eq(transactions.status, "PLANNED"),
          isNull(transactions.deletedAt),
          sql`${transactions.occurredOn} between ${input.from} and ${input.to}`,
        ),
      )
      .groupBy(transactions.occurredOn)
      .orderBy(asc(transactions.occurredOn));
    const items = rows.map((row) => {
      const plannedIncomeCents = safeMoney(row.incomeCents);
      const plannedExpenseCents = safeMoney(row.expenseCents);
      const plannedInvestmentCents = safeMoney(row.investmentCents);
      return {
        date: row.date,
        plannedIncomeCents,
        plannedExpenseCents,
        plannedInvestmentCents,
        plannedNetCents: plannedIncomeCents - plannedExpenseCents - plannedInvestmentCents,
      };
    });
    return {
      ...input,
      items,
      totals: items.reduce(
        (total, item) => ({
          plannedIncomeCents: total.plannedIncomeCents + item.plannedIncomeCents,
          plannedExpenseCents: total.plannedExpenseCents + item.plannedExpenseCents,
          plannedInvestmentCents: total.plannedInvestmentCents + item.plannedInvestmentCents,
          plannedNetCents: total.plannedNetCents + item.plannedNetCents,
        }),
        {
          plannedIncomeCents: 0,
          plannedExpenseCents: 0,
          plannedInvestmentCents: 0,
          plannedNetCents: 0,
        },
      ),
      calculatedAt,
      dataVersion: 1,
    };
  }

  async categorySpending(month: string, calculatedAt: string) {
    const rows = await this.database
      .select({
        categoryId: categories.publicId,
        categoryName: categories.name,
        color: categories.color,
        realizedCents: sql<bigint>`coalesce(sum(case when ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
        plannedCents: sql<bigint>`coalesce(sum(case when ${transactions.status} = 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.workspaceId, this.context.workspaceId),
          // In PAYMENT_ONLY mode a card purchase is stored as CARD_PAYMENT so it
          // does not affect the accounting result before the statement is paid.
          // It still represents consumption and must remain visible by category.
          inArray(transactions.type, ["EXPENSE", "CARD_PAYMENT"]),
          eq(transactions.competenceMonth, month),
          isNull(transactions.deletedAt),
        ),
      )
      .groupBy(categories.id, categories.publicId, categories.name, categories.color)
      .orderBy(sql`sum(${transactions.amountCents}) desc`);
    const items = rows.map((row) => {
      const realizedCents = safeMoney(row.realizedCents);
      const plannedCents = safeMoney(row.plannedCents);
      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        color: row.color,
        realizedCents,
        plannedCents,
        totalCents: realizedCents + plannedCents,
      };
    });
    return {
      month,
      items,
      totals: items.reduce(
        (total, item) => ({
          realizedCents: total.realizedCents + item.realizedCents,
          plannedCents: total.plannedCents + item.plannedCents,
          totalCents: total.totalCents + item.totalCents,
        }),
        { realizedCents: 0, plannedCents: 0, totalCents: 0 },
      ),
      calculatedAt,
      dataVersion: 1,
    };
  }

  async createExport(publicId: string, jobId: string, input: ExportInput): Promise<void> {
    await this.database.insert(exports).values({
      publicId,
      workspaceId: this.context.workspaceId,
      requestedBy: this.context.userId,
      report: input.report,
      format: input.format,
      filters: input.filters,
    });
    await this.database.insert(jobRuns).values({
      publicId: jobId,
      workspaceId: this.context.workspaceId,
      jobName: "report-export",
      jobVersion: 1,
      executionKey: `report-export:${publicId}`,
      payload: { exportId: publicId },
    });
  }

  async findExport(publicId: string) {
    const rows = await this.database
      .select({
        id: exports.publicId,
        report: exports.report,
        format: exports.format,
        status: exports.status,
        progress: exports.progress,
        expiresAt: exports.expiresAt,
        completedAt: exports.completedAt,
        errorCode: exports.errorCode,
      })
      .from(exports)
      .where(and(eq(exports.workspaceId, this.context.workspaceId), eq(exports.publicId, publicId)))
      .limit(1);
    const item = rows[0];
    return item
      ? exportSchema.parse({
          ...item,
          expiresAt: item.expiresAt?.toISOString() ?? null,
          completedAt: item.completedAt?.toISOString() ?? null,
        })
      : null;
  }

  async createDownloadToken(exportId: string, tokenHash: string, expiresAt: Date) {
    const matches = await this.database
      .select({ id: exports.id })
      .from(exports)
      .where(
        and(
          eq(exports.workspaceId, this.context.workspaceId),
          eq(exports.publicId, exportId),
          eq(exports.status, "READY"),
          gt(exports.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const item = matches[0];
    if (!item) return false;
    await this.database
      .insert(exportDownloadTokens)
      .values({ workspaceId: this.context.workspaceId, exportId: item.id, tokenHash, expiresAt });
    return true;
  }

  async consumeDownloadToken(exportId: string, tokenHash: string, consumedAt: Date) {
    const rows = await this.database
      .select({
        tokenId: exportDownloadTokens.id,
        storageKey: exports.storageKey,
        checksum: exports.checksum,
        format: exports.format,
      })
      .from(exportDownloadTokens)
      .innerJoin(exports, eq(exports.id, exportDownloadTokens.exportId))
      .where(
        and(
          eq(exportDownloadTokens.workspaceId, this.context.workspaceId),
          eq(exportDownloadTokens.tokenHash, tokenHash),
          gt(exportDownloadTokens.expiresAt, consumedAt),
          isNull(exportDownloadTokens.consumedAt),
          eq(exports.workspaceId, this.context.workspaceId),
          eq(exports.publicId, exportId),
          eq(exports.status, "READY"),
          gt(exports.expiresAt, consumedAt),
        ),
      )
      .limit(1)
      .for("update");
    const item = rows[0];
    if (!item?.storageKey || !item.checksum || (item.format !== "CSV" && item.format !== "JSON"))
      return null;
    const consumed = await this.database
      .update(exportDownloadTokens)
      .set({ consumedAt })
      .where(
        and(eq(exportDownloadTokens.id, item.tokenId), isNull(exportDownloadTokens.consumedAt)),
      )
      .returning({ id: exportDownloadTokens.id });
    return consumed[0]
      ? { storageKey: item.storageKey, checksum: item.checksum, format: item.format }
      : null;
  }

  async findDownloadArtifact(exportId: string, tokenHash: string, now: Date) {
    const item = (
      await this.database
        .select({
          storageKey: exports.storageKey,
          checksum: exports.checksum,
          format: exports.format,
        })
        .from(exportDownloadTokens)
        .innerJoin(exports, eq(exports.id, exportDownloadTokens.exportId))
        .where(
          and(
            eq(exportDownloadTokens.workspaceId, this.context.workspaceId),
            eq(exportDownloadTokens.tokenHash, tokenHash),
            gt(exportDownloadTokens.expiresAt, now),
            isNull(exportDownloadTokens.consumedAt),
            eq(exports.workspaceId, this.context.workspaceId),
            eq(exports.publicId, exportId),
            eq(exports.status, "READY"),
            gt(exports.expiresAt, now),
          ),
        )
        .limit(1)
    )[0];
    return item?.storageKey && item.checksum && (item.format === "CSV" || item.format === "JSON")
      ? { storageKey: item.storageKey, checksum: item.checksum, format: item.format }
      : null;
  }
}
