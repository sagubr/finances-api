import { env, type Environment } from "#/config/env.config.js";

export type EmailConfig = Readonly<{
  resendApiKey?: string;
  emailFrom?: string;
  emailReplyTo?: string;
}>;

export const createEmailConfig = (value: Environment): EmailConfig => ({
  ...(value.RESEND_API_KEY ? { resendApiKey: value.RESEND_API_KEY } : {}),
  ...(value.EMAIL_FROM ? { emailFrom: value.EMAIL_FROM } : {}),
  ...(value.EMAIL_REPLY_TO ? { emailReplyTo: value.EMAIL_REPLY_TO } : {}),
});

export const emailConfig = createEmailConfig(env);
