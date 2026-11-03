import type { IIdentityRepository } from "../ports/identity.repository.js";
import type { SessionResolver } from "../session-resolver.js";

export class ListSessionsUseCase {
  constructor(
    private readonly sessionResolver: SessionResolver,
    private readonly repository: IIdentityRepository,
  ) {}

  async execute(token: string) {
    const session = await this.sessionResolver.resolve(token);
    return this.repository.listSessions(session.userId, session.internalId);
  }
}
