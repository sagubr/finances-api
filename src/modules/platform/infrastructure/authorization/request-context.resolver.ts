import type { Database } from "#/infrastructure/database/db.provider.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import {
  sessions,
  users,
  workspaceMembers,
  workspaces,
} from "#/modules/platform/infrastructure/database/platform.schema.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

export class RequestContextResolver implements IRequestContextResolver {
  constructor(private readonly database: Database) {}

  async resolve(input: Parameters<IRequestContextResolver["resolve"]>[0]): Promise<RequestContext> {
    return this.database.transaction(async (transaction) => {
      const sessionRows = await transaction
        .select({
          userId: users.id,
          userPublicId: users.publicId,
          sessionId: sessions.id,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(
          and(
            eq(sessions.tokenHash, input.sessionTokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
            gt(sessions.absoluteExpiresAt, new Date()),
            isNull(users.disabledAt),
          ),
        )
        .limit(1);
      const authenticated = sessionRows[0];
      if (!authenticated)
        throw new ApplicationError("Sua sessão expirou. Entre novamente.", {
          category: "unauthenticated",
          code: "SESSION_INVALID",
        });

      await transaction
        .update(sessions)
        .set({
          lastSeenAt: new Date(),
          expiresAt: sql`least(now() + interval '7 days', ${sessions.absoluteExpiresAt})`,
        })
        .where(eq(sessions.id, authenticated.sessionId));

      await transaction.execute(
        sql`select set_config('app.actor_id', ${authenticated.userId.toString()}, true)`,
      );
      const membershipRows = await transaction
        .select({
          workspaceId: workspaces.id,
          workspacePublicId: workspaces.publicId,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(
          workspaces,
          and(eq(workspaces.id, workspaceMembers.workspaceId), isNull(workspaces.deletedAt)),
        )
        .where(
          and(
            eq(workspaceMembers.userId, authenticated.userId),
            eq(workspaceMembers.active, true),
            eq(workspaces.publicId, input.workspacePublicId),
          ),
        )
        .limit(1);
      const membership = membershipRows[0];
      if (!membership)
        throw new ApplicationError("Recurso não encontrado.", {
          category: "not-found",
          code: "WORKSPACE_NOT_FOUND",
        });

      return {
        userId: authenticated.userId,
        userPublicId: authenticated.userPublicId,
        sessionId: authenticated.sessionId,
        workspaceId: membership.workspaceId,
        workspacePublicId: membership.workspacePublicId,
        role: membership.role,
        requestId: input.requestId,
      };
    });
  }
}
