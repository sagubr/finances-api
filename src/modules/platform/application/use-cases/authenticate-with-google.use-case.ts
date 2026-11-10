import type { IGoogleOAuthClient } from "#/modules/platform/application/google-oauth.client.js";
import type { IIdentityRepository } from "#/modules/platform/application/ports/identity.repository.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export type AuthenticateWithGoogleCommand = Readonly<{
  code: string;
  codeVerifier: string;
  ip: string;
  userAgent?: string;
}>;

export class AuthenticateWithGoogleUseCase {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly google: IGoogleOAuthClient,
    private readonly hash: (value: string) => string,
    private readonly generateToken: () => string,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async execute(command: AuthenticateWithGoogleCommand) {
    const identity = await this.google.exchangeCode(command.code, command.codeVerifier);
    if (!identity.emailVerified)
      throw new ApplicationError("O Google não confirmou este endereço de e-mail.", {
        category: "forbidden",
        code: "GOOGLE_EMAIL_NOT_VERIFIED",
      });

    const authenticatedAt = this.now();
    const correlationId = this.generateId();
    const userId = await this.repository.authenticateExternalIdentity({
      provider: "google",
      subject: identity.subject,
      email: identity.email,
      displayName: identity.displayName,
      authenticatedAt,
      userPublicId: this.generateId(),
      workspacePublicId: this.generateId(),
      workspaceName: "Minhas finanças",
      userRegisteredEventId: this.generateId(),
      workspaceCreatedEventId: this.generateId(),
      correlationId,
    });
    if (userId === null)
      throw new ApplicationError("Esta conta está desabilitada.", {
        category: "forbidden",
        code: "ACCOUNT_DISABLED",
      });

    const token = this.generateToken();
    const sessionId = this.generateId();
    const now = authenticatedAt.getTime();
    await this.repository.createSession({
      publicId: sessionId,
      userId,
      tokenHash: this.hash(token),
      familyId: this.generateId(),
      ...(command.userAgent ? { userAgent: command.userAgent.slice(0, 512) } : {}),
      ipHash: this.hash(command.ip),
      expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1_000),
      absoluteExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1_000),
    });
    return { token, sessionId };
  }
}
