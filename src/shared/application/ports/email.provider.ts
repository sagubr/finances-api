export type EmailMessage = Readonly<{
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}>;

export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>;
}
