import type { IIdentityRepository } from "./ports/identity.repository.js";

export type IdentityEmailPurpose = "EMAIL_CONFIRMATION" | "PASSWORD_RESET";

export class IdentityEmailService {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly generateToken: () => string,
    private readonly generateId: () => string,
    private readonly hashToken: (token: string) => string,
    private readonly encryptToken: (token: string) => string,
    private readonly now: () => Date,
  ) {}

  async request(email: string, purpose: IdentityEmailPurpose): Promise<void> {
    const user = await this.repository.findUserForEmail(email, purpose === "EMAIL_CONFIRMATION");
    if (!user) return;
    const token = this.generateToken();
    const publicId = this.generateId();
    await this.repository.createEmailToken({
      publicId,
      userId: user.internalId,
      userPublicId: user.publicId,
      purpose,
      tokenHash: this.hashToken(token),
      tokenCiphertext: this.encryptToken(token),
      expiresAt: new Date(this.now().getTime() + 60 * 60 * 1_000),
      eventId: this.generateId(),
      correlationId: this.generateId(),
    });
  }
}
