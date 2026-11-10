import type { EmailMessage, IEmailProvider } from "./ports/email.provider.js";

export class EmailService {
  constructor(private readonly provider: IEmailProvider) {}

  send(message: EmailMessage): Promise<void> {
    return this.provider.send(message);
  }
}
