import type { IdentityEmailService } from "../identity-email.service.js";

export class ResendConfirmationUseCase {
  constructor(private readonly emailService: IdentityEmailService) {}
  async execute(email: string): Promise<void> {
    await this.emailService.request(email, "EMAIL_CONFIRMATION");
  }
}
