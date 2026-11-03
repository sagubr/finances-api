import { ApplicationError } from "#/shared/application/application.error.js";
import type { IIdentityRepository } from "../ports/identity.repository.js";

export class ResetPasswordUseCase {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly hashToken: (token: string) => string,
    private readonly hashPassword: (password: string) => Promise<string>,
  ) {}

  async execute(token: string, password: string): Promise<void> {
    const changed = await this.repository.resetPassword(
      this.hashToken(token),
      await this.hashPassword(password),
    );
    if (changed) return;
    throw new ApplicationError("O link é inválido ou expirou.", {
      category: "validation",
      code: "TOKEN_INVALID",
    });
  }
}
