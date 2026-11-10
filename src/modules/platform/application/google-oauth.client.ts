import { ApplicationError } from "#/shared/application/application.error.js";
import { z } from "zod";

const tokenResponseSchema = z.object({ access_token: z.string().min(1) });
const userInfoSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().email().max(320),
  email_verified: z.boolean(),
  name: z.string().trim().min(1).max(120).optional(),
});

export type GoogleIdentity = Readonly<{
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}>;

export interface IGoogleOAuthClient {
  createAuthorizationUrl(state: string, codeChallenge: string): string;
  exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity>;
}

export class GoogleOAuthClient implements IGoogleOAuthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  createAuthorizationUrl(state: string, codeChallenge: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> {
    try {
      const tokenResponse = await this.request("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenResponse.ok)
        throw new Error(`Google token endpoint returned ${tokenResponse.status}`);
      const token = tokenResponseSchema.parse(await tokenResponse.json());
      const userResponse = await this.request("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!userResponse.ok)
        throw new Error(`Google userinfo endpoint returned ${userResponse.status}`);
      const user = userInfoSchema.parse(await userResponse.json());
      return {
        subject: user.sub,
        email: user.email.toLowerCase(),
        emailVerified: user.email_verified,
        displayName: user.name ?? user.email.split("@")[0] ?? "Usuário",
      };
    } catch (cause: unknown) {
      throw new ApplicationError("Não foi possível validar sua conta Google.", {
        category: "unavailable",
        code: "GOOGLE_OAUTH_UNAVAILABLE",
        cause,
      });
    }
  }
}
