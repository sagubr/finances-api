import type { IIdentityEmailRepository } from "#/modules/platform/application/ports/identity-email.repository.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import type { EmailService } from "#/shared/application/email.service.js";
import { createIdentityEmailTemplate } from "../identity-email.templates.js";

export class SendIdentityEmailUseCase {
  constructor(
    private readonly repository: IIdentityEmailRepository,
    private readonly emailService: EmailService,
    private readonly decryptToken: (ciphertext: string) => string,
    private readonly webAppUrl: string,
  ) {}

  async execute(eventId: string, payload: unknown): Promise<void> {
    const tokenId = this.readTokenId(payload);
    const pending = await this.repository.findPendingByTokenId(tokenId);
    if (!pending) return;
    const template = createIdentityEmailTemplate({
      purpose: pending.purpose,
      displayName: pending.displayName,
      token: this.decryptToken(pending.tokenCiphertext),
      webAppUrl: this.webAppUrl,
    });
    await this.emailService.send({
      to: pending.email,
      ...template,
      idempotencyKey: `identity-email/${eventId}`,
    });
  }

  private readTokenId(payload: unknown): string {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "tokenId" in payload &&
      typeof payload.tokenId === "string"
    )
      return payload.tokenId;
    throw new ApplicationError("Evento de e-mail de identidade inválido.", {
      category: "validation",
      code: "IDENTITY_EMAIL_EVENT_INVALID",
    });
  }
}
