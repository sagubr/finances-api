import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import { transactions } from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import {
  cardProjectionSources,
  transactionSource,
} from "#/modules/transactions/public/transaction-source.js";
import { and, eq, inArray, sql } from "drizzle-orm";

type StatementProjection = Readonly<{
  statementId: string;
  accountId: bigint;
  cardName: string;
  currency: string;
  dueOn: string;
  totalCents: bigint;
  paidCents: bigint;
}>;

type ProjectionContext = Readonly<{ workspaceId: bigint; userId?: bigint }>;

export class CardStatementProjectionWriter {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: ProjectionContext,
    private readonly generateId: () => string,
  ) {}

  async sync(input: StatementProjection): Promise<void> {
    const remainingCents = input.totalCents - input.paidCents;
    if (remainingCents <= 0n) {
      await this.database
        .update(transactions)
        .set({
          deletedAt: new Date(),
          version: sql`${transactions.version} + 1`,
          updatedAt: new Date(),
          updatedBy: this.context.userId,
        })
        .where(
          and(
            eq(transactions.workspaceId, this.context.workspaceId),
            inArray(transactions.sourceModule, cardProjectionSources),
            eq(transactions.sourcePublicId, input.statementId),
          ),
        );
      return;
    }

    const existing = (
      await this.database
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.workspaceId, this.context.workspaceId),
            inArray(transactions.sourceModule, cardProjectionSources),
            eq(transactions.sourcePublicId, input.statementId),
          ),
        )
        .limit(1)
    )[0];
    if (existing) {
      await this.database
        .update(transactions)
        .set({
          accountId: input.accountId,
          amountCents: remainingCents,
          description: `Fatura ${input.cardName}`,
          occurredOn: input.dueOn,
          competenceMonth: input.dueOn.slice(0, 7),
          status: "PLANNED",
          settledOn: null,
          deletedAt: null,
          version: sql`${transactions.version} + 1`,
          updatedAt: new Date(),
          updatedBy: this.context.userId,
        })
        .where(eq(transactions.id, existing.id));
      return;
    }

    await this.database
      .insert(transactions)
      .values({
        publicId: this.generateId(),
        workspaceId: this.context.workspaceId,
        accountId: input.accountId,
        type: "CARD_PAYMENT",
        status: "PLANNED",
        amountCents: remainingCents,
        currency: input.currency,
        description: `Fatura ${input.cardName}`,
        occurredOn: input.dueOn,
        competenceMonth: input.dueOn.slice(0, 7),
        sourceModule: transactionSource.cardProjection,
        sourcePublicId: input.statementId,
        sourceSequence: 1,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .onConflictDoUpdate({
        target: [
          transactions.workspaceId,
          transactions.sourceModule,
          transactions.sourcePublicId,
          transactions.sourceSequence,
        ],
        targetWhere: sql`${transactions.sourcePublicId} is not null`,
        set: {
          accountId: input.accountId,
          amountCents: remainingCents,
          description: `Fatura ${input.cardName}`,
          occurredOn: input.dueOn,
          competenceMonth: input.dueOn.slice(0, 7),
          status: "PLANNED",
          settledOn: null,
          deletedAt: null,
          version: sql`${transactions.version} + 1`,
          updatedAt: new Date(),
          updatedBy: this.context.userId,
        },
      });
  }
}
