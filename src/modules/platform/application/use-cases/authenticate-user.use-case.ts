import { ApplicationError } from "#/shared/application/application.error.js";
import type { IIdentityRepository } from "../ports/identity.repository.js";

export type AuthenticateUserCommand = Readonly<{
  email: string;
  password: string;
  ip: string;
  userAgent?: string;
}>;

export class AuthenticateUserUseCase {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly verifyPassword: (
      hash: string | undefined,
      password: string,
    ) => Promise<boolean>,
    private readonly hash: (value: string) => string,
    private readonly generateToken: () => string,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async execute(command: AuthenticateUserCommand) {
    const attemptedAt = this.now();
    const emailHash = this.hash(command.email);
    const ipHash = this.hash(command.ip);
    const recentFailures = await this.repository.countRecentFailedLoginAttempts(
      emailHash,
      ipHash,
      new Date(attemptedAt.getTime() - 15 * 60 * 1_000),
    );
    if (recentFailures >= 10)
      throw new ApplicationError("Muitas tentativas de acesso. Tente novamente mais tarde.", {
        category: "rate-limit",
        code: "LOGIN_RATE_LIMITED",
      });
    const credential = await this.repository.findCredentialByEmail(command.email);
    const isValid = await this.verifyPassword(credential?.passwordHash, command.password);
    await this.repository.recordLoginAttempt(emailHash, ipHash, isValid);
    if (!credential || !isValid)
      throw new ApplicationError("E-mail ou senha inválidos.", {
        category: "unauthenticated",
        code: "INVALID_CREDENTIALS",
      });

    const token = this.generateToken();
    const sessionId = this.generateId();
    const now = attemptedAt.getTime();
    await this.repository.createSession({
      publicId: sessionId,
      userId: credential.userId,
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
