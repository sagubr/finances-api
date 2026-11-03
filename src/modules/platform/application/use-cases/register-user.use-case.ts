import type {
  IIdentityRepository,
  RegisterUserInput,
  RegisteredUser,
} from "#/modules/platform/application/ports/identity.repository.js";
import type { RegisterInput } from "#/modules/platform/dtos/identity.dto.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export class RegisterUserUseCase {
  constructor(
    private readonly repository: IIdentityRepository,
    private readonly hashPassword: (password: string) => Promise<string>,
    private readonly opaqueToken: () => string,
    private readonly generateId: () => string,
    private readonly hashToken: (token: string) => string,
    private readonly encryptToken: (token: string) => string,
    private readonly now: () => Date,
    private readonly autoConfirmEmail = false,
  ) {}

  async execute(input: RegisterInput): Promise<RegisteredUser> {
    const token = this.opaqueToken();
    const userPublicId = this.generateId();
    const now = this.now();
    const command: RegisterUserInput = {
      email: input.email,
      displayName: input.displayName,
      passwordHash: await this.hashPassword(input.password),
      userPublicId,
      workspacePublicId: this.generateId(),
      workspaceName: "Minhas finanças",
      ...(this.autoConfirmEmail
        ? { emailConfirmedAt: now }
        : {
            emailToken: {
              publicId: this.generateId(),
              userPublicId,
              purpose: "EMAIL_CONFIRMATION" as const,
              tokenHash: this.hashToken(token),
              tokenCiphertext: this.encryptToken(token),
              expiresAt: new Date(now.getTime() + 60 * 60 * 1_000),
              eventId: this.generateId(),
              correlationId: this.generateId(),
            },
          }),
      userRegisteredEventId: this.generateId(),
      workspaceCreatedEventId: this.generateId(),
      correlationId: this.generateId(),
    };
    const registered = await this.repository.registerUser(command);
    if (!registered)
      throw new ApplicationError("Não foi possível criar a conta com esses dados.", {
        category: "conflict",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    return registered;
  }
}
