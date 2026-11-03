import { ApplicationError } from "#/shared/application/application.error.js";
import type { ActiveSession, IIdentityRepository } from "./ports/identity.repository.js";

export class SessionResolver {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly hashToken: (token: string) => string,
  ) {}

  async resolve(token: string): Promise<ActiveSession> {
    const session = await this.repository.resolveActiveSession(this.hashToken(token));
    if (session) return session;
    throw new ApplicationError("Sua sessão expirou. Entre novamente.", {
      category: "unauthenticated",
      code: "SESSION_INVALID",
    });
  }
}
