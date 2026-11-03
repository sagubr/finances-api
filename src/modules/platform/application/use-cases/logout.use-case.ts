import type { IIdentityRepository } from "../ports/identity.repository.js";

export class LogoutUseCase {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly hashToken: (token: string) => string,
  ) {}

  async execute(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.repository.revokeByTokenHash(this.hashToken(token));
  }
}
