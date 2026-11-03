import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { IOperationsRepository } from "#/modules/operations/application/ports/operations.repository.js";
import { notifications } from "#/modules/operations/infrastructure/database/operations.schema.js";
import { mapNotification } from "#/modules/operations/mappers/operations.mapper.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { createCursorPage, decodeCursor } from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, isNull, lt } from "drizzle-orm";

type NotificationPort = Pick<
  IOperationsRepository,
  "listNotifications" | "readAllNotifications" | "readNotification"
>;

export class NotificationRepository implements NotificationPort {
  constructor(
    private readonly database: TenantDatabase,
    private readonly context: RequestContext,
  ) {}

  async listNotifications(query: Parameters<NotificationPort["listNotifications"]>[0]) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select({
        id: notifications.publicId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        referenceType: notifications.referenceType,
        referenceId: notifications.referencePublicId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, this.context.workspaceId),
          eq(notifications.userId, this.context.userId),
          ...(cursor ? [lt(notifications.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(notifications.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapNotification), query.limit);
  }

  async readAllNotifications() {
    const rows = await this.database
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.workspaceId, this.context.workspaceId),
          eq(notifications.userId, this.context.userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });
    return rows.length;
  }

  async readNotification(id: string) {
    await this.database
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.workspaceId, this.context.workspaceId),
          eq(notifications.userId, this.context.userId),
          eq(notifications.publicId, id),
          isNull(notifications.readAt),
        ),
      );
  }
}
