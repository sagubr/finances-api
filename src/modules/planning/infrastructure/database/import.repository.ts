import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IImportRepository } from "#/modules/planning/application/ports/import.repository.js";
import { committableImportRowSchema } from "#/modules/planning/dtos/import.dto.js";
import {
  importBatches,
  importCommits,
  importRows,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { workspaces } from "#/modules/platform/infrastructure/database/platform.schema.js";
import {
  accounts,
  categories,
  transactions,
} from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

export class ImportRepository implements IImportRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
    private readonly generateId: () => string,
  ) {}

  async createPreview(
    metadata: Parameters<IImportRepository["createPreview"]>[0],
    rows: Parameters<IImportRepository["createPreview"]>[1],
  ) {
    const inserted = await this.database
      .insert(importBatches)
      .values({
        publicId: metadata.batchId,
        workspaceId: this.context.workspaceId,
        status: "PROCESSING",
        fileName: metadata.fileName.slice(0, 255),
        mimeType: metadata.mimeType,
        storageKey: metadata.storageKey,
        checksum: metadata.checksum,
        fileSize: BigInt(metadata.fileSize),
        rowCount: rows.length,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
      })
      .onConflictDoNothing({ target: [importBatches.workspaceId, importBatches.checksum] })
      .returning({ id: importBatches.id });
    const batch = inserted[0];
    if (!batch)
      throw new ApplicationError("Este arquivo já foi enviado.", {
        category: "conflict",
        code: "IMPORT_DUPLICATE_FILE",
      });
    const values = rows.map((row, index) => ({
      publicId: this.generateId(),
      workspaceId: this.context.workspaceId,
      batchId: batch.id,
      rowNumber: index + 2,
      status: row.errors.length === 0 ? ("VALID" as const) : ("ERROR" as const),
      raw: row.raw,
      normalized: row.normalized,
      fingerprint: sql<string>`encode(digest(${JSON.stringify(row.normalized)}, 'sha256'), 'hex')`,
      errors: [...row.errors],
    }));
    if (values.length > 0) await this.database.insert(importRows).values(values);
    await this.database
      .update(importBatches)
      .set({ status: "PREVIEWED", updatedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
    const valid = rows.filter((row) => row.errors.length === 0).length;
    return {
      id: metadata.batchId,
      status: "PREVIEWED" as const,
      rowCount: rows.length,
      valid,
      invalid: rows.length - valid,
    };
  }

  async findBatch(publicId: string) {
    const rows = await this.database
      .select()
      .from(importBatches)
      .where(
        and(
          eq(importBatches.workspaceId, this.context.workspaceId),
          eq(importBatches.publicId, publicId),
        ),
      )
      .limit(1);
    const batch = rows[0] ?? this.notFound();
    return {
      id: batch.publicId,
      status: batch.status,
      fileName: batch.fileName,
      rowCount: batch.rowCount,
      createdAt: batch.createdAt.toISOString(),
      committedAt: batch.committedAt?.toISOString() ?? null,
      rolledBackAt: batch.rolledBackAt?.toISOString() ?? null,
    };
  }

  async listRows(batchPublicId: string, query: Parameters<IImportRepository["listRows"]>[1]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({ row: importRows })
      .from(importRows)
      .innerJoin(importBatches, eq(importBatches.id, importRows.batchId))
      .where(
        and(
          eq(importRows.workspaceId, this.context.workspaceId),
          eq(importBatches.publicId, batchPublicId),
          ...(cursor ? [gt(importRows.publicId, cursor)] : []),
        ),
      )
      .orderBy(asc(importRows.publicId))
      .limit(query.limit + 1);
    return createCursorPage(
      rows.map(({ row }) => this.mapRow(row)),
      query.limit,
    );
  }

  async updateRow(
    batchPublicId: string,
    rowPublicId: string,
    row: Parameters<IImportRepository["updateRow"]>[2],
  ) {
    const batch = await this.database
      .select({ id: importBatches.id })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.workspaceId, this.context.workspaceId),
          eq(importBatches.publicId, batchPublicId),
          eq(importBatches.status, "PREVIEWED"),
        ),
      )
      .limit(1);
    const editableBatch = batch[0] ?? this.rowNotFound();
    const updated = await this.database
      .update(importRows)
      .set({
        normalized: row.normalized,
        errors: [...row.errors],
        status: row.errors.length === 0 ? "VALID" : "ERROR",
      })
      .where(
        and(
          eq(importRows.workspaceId, this.context.workspaceId),
          eq(importRows.batchId, editableBatch.id),
          eq(importRows.publicId, rowPublicId),
        ),
      )
      .returning();
    const updatedRow = updated[0] ?? this.rowNotFound();
    return this.mapRow(updatedRow);
  }

  async commit(
    batchPublicId: string,
    input: Parameters<IImportRepository["commit"]>[1],
    commitId: string,
    generateId: () => string,
  ) {
    await this.database.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`import:${this.context.workspaceId}:${batchPublicId}`}, 0))`,
    );
    const batches = await this.database
      .select()
      .from(importBatches)
      .where(
        and(
          eq(importBatches.workspaceId, this.context.workspaceId),
          eq(importBatches.publicId, batchPublicId),
        ),
      )
      .limit(1)
      .for("update");
    const batch = batches[0] ?? this.notFound();
    if (batch.status === "COMMITTED")
      return { id: batchPublicId, status: "COMMITTED" as const, repeated: true };
    if (batch.status !== "PREVIEWED")
      throw new ApplicationError("O lote não está pronto para commit.", {
        category: "conflict",
        code: "IMPORT_NOT_READY",
      });
    const conditions = [
      eq(importRows.workspaceId, this.context.workspaceId),
      eq(importRows.batchId, batch.id),
      eq(importRows.status, "VALID"),
      ...(input.rowIds ? [inArray(importRows.publicId, input.rowIds)] : []),
    ];
    const selectedRows = await this.database
      .select()
      .from(importRows)
      .where(and(...conditions))
      .orderBy(importRows.rowNumber);
    const workspace = await this.database
      .select({ currency: workspaces.baseCurrency })
      .from(workspaces)
      .where(eq(workspaces.id, this.context.workspaceId))
      .limit(1);
    const currency = workspace[0]?.currency;
    if (!currency) throw new Error("Workspace currency was not found.");
    for (const selected of selectedRows) {
      const value = committableImportRowSchema.parse(selected.normalized);
      const accountRows = await this.database
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.workspaceId, this.context.workspaceId),
            eq(accounts.publicId, value.accountId),
            eq(accounts.active, true),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1);
      const categoryRows = value.categoryId
        ? await this.database
            .select({ id: categories.id })
            .from(categories)
            .where(
              and(
                eq(categories.workspaceId, this.context.workspaceId),
                eq(categories.publicId, value.categoryId),
                eq(categories.type, value.type),
                eq(categories.active, true),
              ),
            )
            .limit(1)
        : [];
      const account = accountRows[0];
      const category = categoryRows[0];
      if (!account || (value.categoryId && !category))
        throw new ApplicationError("Uma linha possui conta ou categoria inválida.", {
          category: "validation",
          code: "IMPORT_RELATION_INVALID",
          details: { rowId: selected.publicId },
        });
      const created = await this.database
        .insert(transactions)
        .values({
          publicId: generateId(),
          workspaceId: this.context.workspaceId,
          accountId: account.id,
          categoryId: category?.id,
          type: value.type,
          status: "SETTLED",
          amountCents: BigInt(value.amountCents),
          currency,
          description: value.description,
          occurredOn: value.occurredOn,
          competenceMonth: value.occurredOn.slice(0, 7),
          settledOn: value.occurredOn,
          sourceModule: "IMP",
          sourcePublicId: batchPublicId,
          sourceSequence: selected.rowNumber,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning({ id: transactions.id });
      const transaction = created[0];
      if (!transaction) throw new Error("Imported transaction insert did not return an id.");
      await this.database
        .update(importRows)
        .set({ status: "COMMITTED", transactionId: transaction.id })
        .where(eq(importRows.id, selected.id));
    }
    await this.database.insert(importCommits).values({
      publicId: commitId,
      workspaceId: this.context.workspaceId,
      batchId: batch.id,
      selectedRowIds: selectedRows.map((row) => row.publicId),
      committedCount: selectedRows.length,
    });
    await this.database
      .update(importBatches)
      .set({ status: "COMMITTED", committedAt: new Date(), updatedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
    return {
      id: batchPublicId,
      commitId,
      status: "COMMITTED" as const,
      committedCount: selectedRows.length,
      repeated: false,
    };
  }

  async rollback(batchPublicId: string): Promise<number> {
    const batches = await this.database
      .select()
      .from(importBatches)
      .where(
        and(
          eq(importBatches.workspaceId, this.context.workspaceId),
          eq(importBatches.publicId, batchPublicId),
          eq(importBatches.status, "COMMITTED"),
          gt(importBatches.committedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000)),
        ),
      )
      .limit(1)
      .for("update");
    const batch = batches[0];
    if (!batch)
      throw new ApplicationError("Rollback indisponível para este lote.", {
        category: "conflict",
        code: "IMPORT_ROLLBACK_UNAVAILABLE",
      });
    const rows = await this.database
      .select({ transactionId: importRows.transactionId })
      .from(importRows)
      .where(and(eq(importRows.batchId, batch.id), sql`${importRows.transactionId} is not null`));
    const ids = rows.flatMap((row) => (row.transactionId === null ? [] : [row.transactionId]));
    const updated =
      ids.length === 0
        ? []
        : await this.database
            .update(transactions)
            .set({
              deletedAt: new Date(),
              version: sql`${transactions.version} + 1`,
              updatedBy: this.context.userId,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(transactions.workspaceId, this.context.workspaceId),
                inArray(transactions.id, ids),
                isNull(transactions.deletedAt),
              ),
            )
            .returning({ id: transactions.id });
    await this.database
      .update(importBatches)
      .set({ status: "ROLLED_BACK", rolledBackAt: new Date(), updatedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
    return updated.length;
  }

  private mapRow(row: typeof importRows.$inferSelect) {
    return {
      id: row.publicId,
      rowNumber: row.rowNumber,
      status: row.status,
      normalized: row.normalized as Readonly<Record<string, unknown>> | null,
      errors: Array.isArray(row.errors)
        ? row.errors.filter((value): value is string => typeof value === "string")
        : [],
    };
  }
  private notFound(): never {
    throw new ApplicationError("Importação não encontrada.", {
      category: "not-found",
      code: "IMPORT_NOT_FOUND",
    });
  }
  private rowNotFound(): never {
    throw new ApplicationError("Linha não encontrada ou lote não editável.", {
      category: "not-found",
      code: "IMPORT_ROW_NOT_FOUND",
    });
  }
}
