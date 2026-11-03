import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type {
  IReportExportJobRepository,
  ReportExportRecord,
} from "#/modules/reports/application/ports/report-export-job.repository.js";
import { exports } from "#/modules/reports/infrastructure/database/reports.schema.js";
import { transactions } from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

export class ReportExportJobRepository implements IReportExportJobRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
  ) {}

  async claim(publicId: string): Promise<ReportExportRecord | null> {
    const item = (
      await this.database
        .select({
          id: exports.id,
          report: exports.report,
          format: exports.format,
          filters: exports.filters,
        })
        .from(exports)
        .where(
          and(
            eq(exports.workspaceId, this.workspaceId),
            eq(exports.publicId, publicId),
            inArray(exports.status, ["PENDING", "RUNNING"]),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!item) return null;
    await this.database
      .update(exports)
      .set({ status: "RUNNING", progress: 5, updatedAt: new Date() })
      .where(eq(exports.id, item.id));
    return item;
  }

  listTransactions() {
    return this.database
      .select({
        publicId: transactions.publicId,
        type: transactions.type,
        status: transactions.status,
        amountCents: transactions.amountCents,
        currency: transactions.currency,
        description: transactions.description,
        occurredOn: transactions.occurredOn,
        competenceMonth: transactions.competenceMonth,
      })
      .from(transactions)
      .where(and(eq(transactions.workspaceId, this.workspaceId), isNull(transactions.deletedAt)))
      .orderBy(asc(transactions.occurredOn), asc(transactions.id));
  }

  getAnnualRows() {
    return this.database
      .select({
        month: transactions.competenceMonth,
        incomeCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'INCOME' and ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
        expenseCents: sql<bigint>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' and ${transactions.status} <> 'PLANNED' then ${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.workspaceId, this.workspaceId), isNull(transactions.deletedAt)))
      .groupBy(transactions.competenceMonth)
      .orderBy(asc(transactions.competenceMonth));
  }

  async markReady(
    id: bigint,
    artifact: Readonly<{ storageKey: string; checksum: string; expiresAt: Date }>,
  ) {
    await this.database
      .update(exports)
      .set({
        status: "READY",
        progress: 100,
        storageKey: artifact.storageKey,
        checksum: artifact.checksum,
        expiresAt: artifact.expiresAt,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exports.id, id));
  }
}
