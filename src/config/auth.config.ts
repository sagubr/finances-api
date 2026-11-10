import { env, type Environment } from "#/config/env.config.js";

export type AuthConfig = Readonly<{
  cookieSecret?: string;
  tokenEncryptionKey?: string;
  autoConfirmEmail: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri: string;
  webAppUrl: string;
}>;

export const createAuthConfig = (value: Environment): AuthConfig => {
  return {
    ...(value.COOKIE_SECRET ? { cookieSecret: value.COOKIE_SECRET } : {}),
    ...(value.TOKEN_ENCRYPTION_KEY ? { tokenEncryptionKey: value.TOKEN_ENCRYPTION_KEY } : {}),
    autoConfirmEmail: value.AUTH_AUTO_CONFIRM_EMAIL,
    ...(value.GOOGLE_OAUTH_CLIENT_ID ? { googleClientId: value.GOOGLE_OAUTH_CLIENT_ID } : {}),
    ...(value.GOOGLE_OAUTH_CLIENT_SECRET
      ? { googleClientSecret: value.GOOGLE_OAUTH_CLIENT_SECRET }
      : {}),
    googleRedirectUri: value.GOOGLE_OAUTH_REDIRECT_URI,
    webAppUrl: value.WEB_APP_URL,
  };
};

export const authConfig = createAuthConfig(env);
