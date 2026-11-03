import type { IIdentityRepository } from "../ports/identity.repository.js";
import type { SessionResolver } from "../session-resolver.js";

export class RevokeSessionUseCase {
  constructor(
    private readonly sessionResolver: SessionResolver,
    private readonly repository: IIdentityRepository,
  ) {}

  async execute(token: string, sessionPublicId: string): Promise<void> {
    const session = await this.sessionResolver.resolve(token);
    await this.repository.revokeSession(session.userId, sessionPublicId);
  }
}
