import { env, type Environment } from "#/config/env.config.js";

export type AuthConfig = Readonly<{
  cookieSecret?: string;
  tokenEncryptionKey?: string;
}>;

export const createAuthConfig = (value: Environment): AuthConfig => {
  return {
    ...(value.COOKIE_SECRET ? { cookieSecret: value.COOKIE_SECRET } : {}),
    ...(value.TOKEN_ENCRYPTION_KEY ? { tokenEncryptionKey: value.TOKEN_ENCRYPTION_KEY } : {}),
  };
};

export const authConfig = createAuthConfig(env);
