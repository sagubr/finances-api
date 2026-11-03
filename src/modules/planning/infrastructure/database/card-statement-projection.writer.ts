import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import { transactions } from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { and, eq, sql } from "drizzle-orm";

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
            eq(transactions.sourceModule, "CCP"),
            eq(transactions.sourcePublicId, input.statementId),
          ),
        );
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
        sourceModule: "CCP",
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
