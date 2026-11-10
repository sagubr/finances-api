import type { Database } from "#/infrastructure/database/db.provider.js";
import type { IIdentityEmailRepository } from "#/modules/platform/application/ports/identity-email.repository.js";
import { emailTokens, users } from "#/modules/platform/infrastructure/database/platform.schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";

export class IdentityEmailRepository implements IIdentityEmailRepository {
  constructor(private readonly database: Database) {}

  async findPendingByTokenId(tokenId: string) {
    const rows = await this.database
      .select({
        email: users.email,
        displayName: users.displayName,
        purpose: emailTokens.purpose,
        tokenCiphertext: emailTokens.tokenCiphertext,
      })
      .from(emailTokens)
      .innerJoin(users, eq(users.id, emailTokens.userId))
      .where(
        and(
          eq(emailTokens.publicId, tokenId),
          isNull(emailTokens.consumedAt),
          gt(emailTokens.expiresAt, new Date()),
          isNull(users.disabledAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
