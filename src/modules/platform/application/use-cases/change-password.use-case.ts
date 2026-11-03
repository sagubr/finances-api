import { ApplicationError } from "#/shared/application/application.error.js";
import type { IIdentityRepository } from "../ports/identity.repository.js";
import type { SessionResolver } from "../session-resolver.js";

export class ChangePasswordUseCase {
  constructor(
    private readonly sessionResolver: SessionResolver,
    private readonly repository: IIdentityRepository,
    private readonly verify: (hash: string, password: string) => Promise<boolean>,
    private readonly hashPassword: (password: string) => Promise<string>,
  ) {}

  async execute(token: string, currentPassword: string, password: string): Promise<void> {
    const session = await this.sessionResolver.resolve(token);
    const currentHash = await this.repository.getPasswordHash(session.userId);
    if (!currentHash || !(await this.verify(currentHash, currentPassword)))
      throw new ApplicationError("A senha atual não confere.", {
        category: "validation",
        code: "CURRENT_PASSWORD_INVALID",
      });
    await this.repository.changePassword(
      session.userId,
      session.internalId,
      await this.hashPassword(password),
    );
  }
}
