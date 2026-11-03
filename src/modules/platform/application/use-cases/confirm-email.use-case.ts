import { ApplicationError } from "#/shared/application/application.error.js";
import type { IIdentityRepository } from "../ports/identity.repository.js";

export class ConfirmEmailUseCase {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly hashToken: (token: string) => string,
  ) {}

  async execute(token: string): Promise<void> {
    if (await this.repository.confirmEmail(this.hashToken(token))) return;
    throw new ApplicationError("O link é inválido ou expirou.", {
      category: "validation",
      code: "TOKEN_INVALID",
    });
  }
}
