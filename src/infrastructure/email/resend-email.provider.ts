import { ApplicationError } from "#/shared/application/application.error.js";
import type { EmailMessage, IEmailProvider } from "#/shared/application/ports/email.provider.js";
import { Resend } from "resend";

export class ResendEmailProvider implements IEmailProvider {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send(
      {
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(this.replyTo ? { replyTo: this.replyTo } : {}),
      },
      { idempotencyKey: message.idempotencyKey },
    );

    if (error)
      throw new ApplicationError("O provedor de e-mail recusou o envio.", {
        category: "unavailable",
        code: "EMAIL_DELIVERY_FAILED",
        details: { provider: "resend", providerCode: error.name },
      });
  }
}
