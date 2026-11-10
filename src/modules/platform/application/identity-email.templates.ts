import type { IdentityEmailPurpose } from "./identity-email.service.js";

type IdentityEmailTemplateInput = Readonly<{
  purpose: IdentityEmailPurpose;
  displayName: string;
  token: string;
  webAppUrl: string;
}>;

export type IdentityEmailTemplate = Readonly<{
  subject: string;
  html: string;
  text: string;
}>;

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });

const actionUrl = (webAppUrl: string, path: string, token: string): string => {
  const url = new URL(path, webAppUrl);
  url.searchParams.set("token", token);
  return url.toString();
};

export const createIdentityEmailTemplate = (
  input: IdentityEmailTemplateInput,
): IdentityEmailTemplate => {
  const confirmation = input.purpose === "EMAIL_CONFIRMATION";
  const url = actionUrl(
    input.webAppUrl,
    confirmation ? "/confirm-email" : "/reset-password",
    input.token,
  );
  const subject = confirmation ? "Confirme seu e-mail na Nummo" : "Redefina sua senha da Nummo";
  const action = confirmation ? "Confirmar e-mail" : "Redefinir senha";
  const explanation = confirmation
    ? "Confirme seu endereço para concluir a criação da sua conta."
    : "Recebemos uma solicitação para redefinir a senha da sua conta.";
  const safeName = escapeHtml(input.displayName);
  const safeUrl = escapeHtml(url);

  return {
    subject,
    text: `Olá, ${input.displayName}.\n\n${explanation}\n\n${action}: ${url}\n\nEste link expira em 1 hora. Se você não fez esta solicitação, ignore este e-mail.`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#18181b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px"><tr><td style="padding:32px"><p style="margin:0 0 20px;font-size:14px;font-weight:700">Nummo</p><h1 style="margin:0 0 16px;font-size:24px">${subject}</h1><p style="margin:0 0 12px;line-height:1.6">Olá, ${safeName}.</p><p style="margin:0 0 24px;line-height:1.6">${explanation}</p><p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700">${action}</a></p><p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.5">Este link expira em 1 hora.</p><p style="margin:0;color:#71717a;font-size:13px;line-height:1.5">Se você não fez esta solicitação, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`,
  };
};
