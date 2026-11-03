import type { Database } from "#/infrastructure/database/db.provider.js";
import type {
  ActiveSession,
  IIdentityRepository,
  SessionSummary,
  WorkspaceSummary,
} from "#/modules/platform/application/ports/identity.repository.js";
import {
  emailTokens,
  loginAttempts,
  outboxEvents,
  sessions,
  userCredentials,
  users,
  workspaceMembers,
  workspaces,
} from "#/modules/platform/infrastructure/database/platform.schema.js";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

export class IdentityRepository implements IIdentityRepository {
  constructor(private readonly database: Database) {}

  async registerUser(input: Parameters<IIdentityRepository["registerUser"]>[0]) {
    try {
      return await this.database.transaction(async (transaction) => {
        const createdUsers = await transaction
          .insert(users)
          .values({
            publicId: input.userPublicId,
            email: input.email,
            displayName: input.displayName,
          })
          .returning({ id: users.id });
        const userId = createdUsers[0]?.id;
        if (userId === undefined) throw new Error("User insert did not return an id.");
        await transaction.insert(userCredentials).values({
          userId,
          passwordHash: input.passwordHash,
        });
        const createdWorkspaces = await transaction
          .insert(workspaces)
          .values({ publicId: input.workspacePublicId, name: input.workspaceName })
          .returning({ id: workspaces.id });
        const workspaceId = createdWorkspaces[0]?.id;
        if (workspaceId === undefined) throw new Error("Workspace insert did not return an id.");
        await transaction.execute(
          sql`select set_config('app.workspace_id', ${workspaceId.toString()}, true)`,
        );
        await transaction.execute(
          sql`select set_config('app.actor_id', ${userId.toString()}, true)`,
        );
        await transaction.insert(workspaceMembers).values({
          workspaceId,
          userId,
          role: "OWNER",
        });
        await transaction.insert(emailTokens).values({
          publicId: input.emailToken.publicId,
          userId,
          purpose: input.emailToken.purpose,
          tokenHash: input.emailToken.tokenHash,
          tokenCiphertext: input.emailToken.tokenCiphertext,
          expiresAt: input.emailToken.expiresAt,
        });
        await transaction.insert(outboxEvents).values([
          {
            eventId: input.emailToken.eventId,
            eventName: "IdentityEmailRequested",
            eventVersion: 1,
            aggregateType: "user",
            aggregatePublicId: input.userPublicId,
            aggregateVersion: 1,
            correlationId: input.emailToken.correlationId,
            payload: {
              purpose: input.emailToken.purpose,
              tokenId: input.emailToken.publicId,
            },
            occurredAt: new Date(),
          },
          {
            eventId: input.userRegisteredEventId,
            workspaceId,
            eventName: "UserRegistered",
            eventVersion: 1,
            aggregateType: "user",
            aggregatePublicId: input.userPublicId,
            aggregateVersion: 1,
            correlationId: input.correlationId,
            payload: { name: input.workspaceName },
            occurredAt: new Date(),
          },
          {
            eventId: input.workspaceCreatedEventId,
            workspaceId,
            eventName: "WorkspaceCreated",
            eventVersion: 1,
            aggregateType: "workspace",
            aggregatePublicId: input.workspacePublicId,
            aggregateVersion: 1,
            correlationId: input.correlationId,
            payload: {},
            occurredAt: new Date(),
          },
        ]);
        return { userId: input.userPublicId, workspaceId: input.workspacePublicId };
      });
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
        return null;
      throw error;
    }
  }

  async findCredentialByEmail(email: string) {
    const rows = await this.database
      .select({ userId: users.id, passwordHash: userCredentials.passwordHash })
      .from(users)
      .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(and(sql`lower(${users.email}) = ${email}`, isNull(users.disabledAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async recordLoginAttempt(emailHash: string, ipHash: string, succeeded: boolean): Promise<void> {
    await this.database.insert(loginAttempts).values({ emailHash, ipHash, succeeded });
  }

  async countRecentFailedLoginAttempts(emailHash: string, ipHash: string, since: Date) {
    const rows = await this.database
      .select({ total: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.succeeded, false),
          gt(loginAttempts.attemptedAt, since),
          or(eq(loginAttempts.emailHash, emailHash), eq(loginAttempts.ipHash, ipHash)),
        ),
      );
    return rows[0]?.total ?? 0;
  }

  async createSession(input: Parameters<IIdentityRepository["createSession"]>[0]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(${input.userId})`);
      await transaction.insert(sessions).values(input);
      const excess = await transaction
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, input.userId),
            isNull(sessions.revokedAt),
            gt(sessions.absoluteExpiresAt, new Date()),
          ),
        )
        .orderBy(desc(sessions.lastSeenAt), desc(sessions.id))
        .offset(20);
      if (excess.length > 0)
        await transaction
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(
            inArray(
              sessions.id,
              excess.map(({ id }) => id),
            ),
          );
    });
  }

  async confirmEmail(tokenHash: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const consumed = await transaction
        .update(emailTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(emailTokens.tokenHash, tokenHash),
            eq(emailTokens.purpose, "EMAIL_CONFIRMATION"),
            isNull(emailTokens.consumedAt),
            gt(emailTokens.expiresAt, new Date()),
          ),
        )
        .returning({ userId: emailTokens.userId });
      const token = consumed[0];
      if (!token) return false;
      await transaction
        .update(users)
        .set({ emailConfirmedAt: sql`coalesce(${users.emailConfirmedAt}, now())` })
        .where(eq(users.id, token.userId));
      return true;
    });
  }

  async getPasswordHash(userId: bigint): Promise<string | null> {
    const rows = await this.database
      .select({ passwordHash: userCredentials.passwordHash })
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId))
      .limit(1);
    return rows[0]?.passwordHash ?? null;
  }

  async changePassword(
    userId: bigint,
    currentSessionId: bigint,
    passwordHash: string,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(userCredentials)
        .set({
          passwordHash,
          passwordVersion: sql`${userCredentials.passwordVersion} + 1`,
          changedAt: new Date(),
        })
        .where(eq(userCredentials.userId, userId));
      await transaction
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.userId, userId),
            sql`${sessions.id} <> ${currentSessionId}`,
            isNull(sessions.revokedAt),
          ),
        );
    });
  }

  async findUserForEmail(email: string, requireUnconfirmed: boolean) {
    const rows = await this.database
      .select({ internalId: users.id, publicId: users.publicId })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${email}`,
          isNull(users.disabledAt),
          ...(requireUnconfirmed ? [isNull(users.emailConfirmedAt)] : []),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createEmailToken(input: Parameters<IIdentityRepository["createEmailToken"]>[0]) {
    await this.database.transaction(async (transaction) => {
      await transaction.insert(emailTokens).values({
        publicId: input.publicId,
        userId: input.userId,
        purpose: input.purpose,
        tokenHash: input.tokenHash,
        tokenCiphertext: input.tokenCiphertext,
        expiresAt: input.expiresAt,
      });
      await transaction.insert(outboxEvents).values({
        eventId: input.eventId,
        eventName: "IdentityEmailRequested",
        eventVersion: 1,
        aggregateType: "user",
        aggregatePublicId: input.userPublicId,
        aggregateVersion: 1,
        correlationId: input.correlationId,
        payload: { purpose: input.purpose, tokenId: input.publicId },
        occurredAt: new Date(),
      });
    });
  }

  async resetPassword(tokenHash: string, passwordHash: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const consumed = await transaction
        .update(emailTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(emailTokens.tokenHash, tokenHash),
            eq(emailTokens.purpose, "PASSWORD_RESET"),
            isNull(emailTokens.consumedAt),
            gt(emailTokens.expiresAt, new Date()),
          ),
        )
        .returning({ userId: emailTokens.userId });
      const token = consumed[0];
      if (!token) return false;
      await transaction
        .update(userCredentials)
        .set({
          passwordHash,
          passwordVersion: sql`${userCredentials.passwordVersion} + 1`,
          changedAt: new Date(),
        })
        .where(eq(userCredentials.userId, token.userId));
      await transaction
        .update(sessions)
        .set({ revokedAt: sql`coalesce(${sessions.revokedAt}, now())` })
        .where(eq(sessions.userId, token.userId));
      return true;
    });
  }

  async resolveActiveSession(tokenHash: string): Promise<ActiveSession | null> {
    return this.database.transaction(async (transaction) => {
      const rows = await transaction
        .select({
          internalId: sessions.id,
          publicId: sessions.publicId,
          userId: users.id,
          userPublicId: users.publicId,
          email: users.email,
          displayName: users.displayName,
          emailConfirmedAt: users.emailConfirmedAt,
          absoluteExpiresAt: sessions.absoluteExpiresAt,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
            gt(sessions.absoluteExpiresAt, new Date()),
            isNull(users.disabledAt),
          ),
        )
        .limit(1);
      const session = rows[0];
      if (!session) return null;
      await transaction
        .update(sessions)
        .set({
          lastSeenAt: new Date(),
          expiresAt: sql`least(now() + interval '7 days', ${sessions.absoluteExpiresAt})`,
        })
        .where(eq(sessions.id, session.internalId));
      return { ...session, isEmailConfirmed: session.emailConfirmedAt !== null };
    });
  }

  async listSessions(userId: bigint, currentSessionId: bigint): Promise<readonly SessionSummary[]> {
    const rows = await this.database
      .select({
        internalId: sessions.id,
        id: sessions.publicId,
        userAgent: sessions.userAgent,
        lastSeenAt: sessions.lastSeenAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.absoluteExpiresAt, new Date()),
        ),
      )
      .orderBy(desc(sessions.lastSeenAt))
      .limit(20);
    return rows.map(({ internalId, ...session }) => ({
      ...session,
      isCurrent: internalId === currentSessionId,
    }));
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.database
      .update(sessions)
      .set({ revokedAt: sql`coalesce(${sessions.revokedAt}, now())` })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  async revokeSession(userId: bigint, sessionPublicId: string): Promise<void> {
    await this.database
      .update(sessions)
      .set({ revokedAt: sql`coalesce(${sessions.revokedAt}, now())` })
      .where(and(eq(sessions.userId, userId), eq(sessions.publicId, sessionPublicId)));
  }

  async listWorkspaces(userId: bigint): Promise<readonly WorkspaceSummary[]> {
    return this.withActor(userId, async (transaction) =>
      transaction
        .select({
          id: workspaces.publicId,
          name: workspaces.name,
          timezone: workspaces.timezone,
          baseCurrency: workspaces.baseCurrency,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.active, true),
            isNull(workspaces.deletedAt),
          ),
        )
        .orderBy(workspaces.createdAt)
        .limit(200),
    );
  }

  async findWorkspace(userId: bigint, workspacePublicId: string): Promise<WorkspaceSummary | null> {
    return this.withActor(userId, async (transaction) => {
      const rows = await transaction
        .select({
          id: workspaces.publicId,
          name: workspaces.name,
          timezone: workspaces.timezone,
          baseCurrency: workspaces.baseCurrency,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(
          and(
            eq(workspaceMembers.userId, userId),
            eq(workspaceMembers.active, true),
            eq(workspaces.publicId, workspacePublicId),
            isNull(workspaces.deletedAt),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    });
  }

  private async withActor<T>(
    actorId: bigint,
    work: (transaction: Parameters<Parameters<Database["transaction"]>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select set_config('app.actor_id', ${actorId.toString()}, true)`,
      );
      return work(transaction);
    });
  }
}
