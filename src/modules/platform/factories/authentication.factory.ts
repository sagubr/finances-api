import { authConfig } from "#/config/auth.config.js";
import { serverConfig } from "#/config/server.config.js";
import { db } from "#/infrastructure/database/db.provider.js";
import { AesGcmContentCipher } from "#/infrastructure/security/content-cipher.js";
import { IdentityEmailService } from "#/modules/platform/application/identity-email.service.js";
import { SessionResolver } from "#/modules/platform/application/session-resolver.js";
import { AuthenticateUserUseCase } from "#/modules/platform/application/use-cases/authenticate-user.use-case.js";
import { ChangePasswordUseCase } from "#/modules/platform/application/use-cases/change-password.use-case.js";
import { ConfirmEmailUseCase } from "#/modules/platform/application/use-cases/confirm-email.use-case.js";
import { RegisterUserUseCase } from "#/modules/platform/application/use-cases/register-user.use-case.js";
import { RequestPasswordResetUseCase } from "#/modules/platform/application/use-cases/request-password-reset.use-case.js";
import { ResendConfirmationUseCase } from "#/modules/platform/application/use-cases/resend-confirmation.use-case.js";
import { ResetPasswordUseCase } from "#/modules/platform/application/use-cases/reset-password.use-case.js";
import { IdentityRepository } from "#/modules/platform/infrastructure/database/identity.repository.js";
import {
  ChangePasswordController,
  ConfirmEmailController,
  LoginController,
  RegisterController,
  RequestPasswordResetController,
  ResendConfirmationController,
  ResetPasswordController,
} from "#/modules/platform/presentation/controllers/authentication.controller.js";
import { argon2id, hash as hashPassword, verify } from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";

const repository = new IdentityRepository(db);
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");
const sessionResolver = new SessionResolver(repository, hash);
const tokenSecret =
  authConfig.tokenEncryptionKey ??
  authConfig.cookieSecret ??
  "finances-development-token-encryption-key";
const tokenCipher = new AesGcmContentCipher(tokenSecret);
const encryptToken = (token: string): string => tokenCipher.encrypt(token);
const emailService = new IdentityEmailService(
  repository,
  () => randomBytes(32).toString("base64url"),
  uuidv7,
  hash,
  encryptToken,
  () => new Date(),
);

export const authenticationControllers = {
  register: new RegisterController(
    new RegisterUserUseCase(
      repository,
      (password) => hashPassword(password, { type: argon2id }),
      () => randomBytes(32).toString("base64url"),
      uuidv7,
      hash,
      encryptToken,
      () => new Date(),
    ),
  ),
  resendConfirmation: new ResendConfirmationController(new ResendConfirmationUseCase(emailService)),
  requestPasswordReset: new RequestPasswordResetController(
    new RequestPasswordResetUseCase(emailService),
  ),
  resetPassword: new ResetPasswordController(
    new ResetPasswordUseCase(repository, hash, (password) =>
      hashPassword(password, { type: argon2id }),
    ),
  ),
  changePassword: new ChangePasswordController(
    new ChangePasswordUseCase(
      sessionResolver,
      repository,
      (passwordHash, password) => verify(passwordHash, password),
      (password) => hashPassword(password, { type: argon2id }),
    ),
  ),
  confirmEmail: new ConfirmEmailController(new ConfirmEmailUseCase(repository, hash)),
  login: new LoginController(
    new AuthenticateUserUseCase(
      repository,
      async (passwordHash, password) => {
        if (passwordHash) return verify(passwordHash, password);
        await hashPassword(password, { type: argon2id });
        return false;
      },
      hash,
      () => randomBytes(32).toString("base64url"),
      uuidv7,
      () => new Date(),
    ),
    serverConfig.environment === "production",
  ),
} as const;
