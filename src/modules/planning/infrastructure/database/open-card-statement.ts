import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import {
  nextCardCycle,
  resolveCardCycle,
  type CardCycle,
} from "#/modules/planning/domain/card-cycle.js";
import {
  cardStatements,
  type creditCards,
} from "#/modules/planning/infrastructure/database/planning.schema.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { and, eq, sql } from "drizzle-orm";

type Card = Pick<
  typeof creditCards.$inferSelect,
  "id" | "closingDay" | "dueDay" | "accountingMode"
>;

const lockStatement = async (
  database: TenantDatabase,
  id: bigint,
): Promise<typeof cardStatements.$inferSelect> => {
  const statement = (
    await database
      .select()
      .from(cardStatements)
      .where(eq(cardStatements.id, id))
      .limit(1)
      .for("update")
  )[0];
  if (!statement) throw new Error("Card statement lock target was not found.");
  return statement;
};

export const materializeOpenCardStatement = async (
  database: TenantDatabase,
  input: Readonly<{
    workspaceId: bigint;
    card: Card;
    occurredOn: string;
    generateId: () => string;
  }>,
): Promise<typeof cardStatements.$inferSelect> => {
  let cycle: CardCycle = resolveCardCycle(
    input.occurredOn,
    input.card.closingDay,
    input.card.dueDay,
  );

  for (let offset = 0; offset < 120; offset += 1) {
    const existing = (
      await database
        .select({ id: cardStatements.id })
        .from(cardStatements)
        .where(
          and(
            eq(cardStatements.workspaceId, input.workspaceId),
            eq(cardStatements.cardId, input.card.id),
            eq(cardStatements.cycleStartOn, cycle.startsOn),
          ),
        )
        .limit(1)
    )[0];

    if (existing) {
      const statement = await lockStatement(database, existing.id);
      if (statement.status === "OPEN") return statement;
      cycle = nextCardCycle(cycle, input.card.closingDay, input.card.dueDay);
      continue;
    }

    const materialized = (
      await database
        .insert(cardStatements)
        .values({
          publicId: input.generateId(),
          workspaceId: input.workspaceId,
          cardId: input.card.id,
          cycleStartOn: cycle.startsOn,
          cycleEndOn: cycle.endsOn,
          dueOn: cycle.dueOn,
          accountingMode: input.card.accountingMode,
        })
        .onConflictDoUpdate({
          target: [cardStatements.cardId, cardStatements.cycleStartOn],
          set: { updatedAt: sql`${cardStatements.updatedAt}` },
        })
        .returning({ id: cardStatements.id })
    )[0];
    if (!materialized) throw new Error("Card statement was not materialized.");
    const statement = await lockStatement(database, materialized.id);
    if (statement.status === "OPEN") return statement;
    cycle = nextCardCycle(cycle, input.card.closingDay, input.card.dueDay);
  }

  throw new ApplicationError("Não foi possível localizar uma próxima fatura aberta.", {
    category: "conflict",
    code: "OPEN_STATEMENT_NOT_AVAILABLE",
  });
};
