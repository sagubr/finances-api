import type { IGoogleOAuthClient } from "#/modules/platform/application/google-oauth.client.js";
import type { AuthenticateUserUseCase } from "#/modules/platform/application/use-cases/authenticate-user.use-case.js";
import type { AuthenticateWithGoogleUseCase } from "#/modules/platform/application/use-cases/authenticate-with-google.use-case.js";
import type { ChangePasswordUseCase } from "#/modules/platform/application/use-cases/change-password.use-case.js";
import type { ConfirmEmailUseCase } from "#/modules/platform/application/use-cases/confirm-email.use-case.js";
import type { RegisterUserUseCase } from "#/modules/platform/application/use-cases/register-user.use-case.js";
import type { RequestPasswordResetUseCase } from "#/modules/platform/application/use-cases/request-password-reset.use-case.js";
import type { ResendConfirmationUseCase } from "#/modules/platform/application/use-cases/resend-confirmation.use-case.js";
import type { ResetPasswordUseCase } from "#/modules/platform/application/use-cases/reset-password.use-case.js";
import type {
  ChangePasswordInput,
  EmailInput,
  GoogleCallbackQuery,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  TokenInput,
} from "#/modules/platform/dtos/identity.dto.js";
import { ApiError } from "#/shared/http/api.error.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";

const absoluteSessionDurationSeconds = 30 * 24 * 60 * 60;
const oauthStateCookie = "finances_google_oauth_state";
const oauthVerifierCookie = "finances_google_oauth_verifier";

const setSessionCookie = (reply: FastifyReply, token: string, isProduction: boolean): void => {
  reply.setCookie("finances_session", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: absoluteSessionDurationSeconds,
  });
};

export class RegisterController {
  constructor(private readonly useCase: RegisterUserUseCase) {}

  async handle(request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) {
    const registered = await this.useCase.execute(request.body);
    const message = registered.emailConfirmationRequired
      ? "Conta criada. Confira seu e-mail para confirmar o cadastro."
      : "Conta criada e confirmada. Você já pode entrar.";
    return reply.status(201).send(response(registered, message));
  }
}

export class LoginController {
  constructor(
    private readonly useCase: AuthenticateUserUseCase,
    private readonly isProduction: boolean,
  ) {}

  async handle(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
    const result = await this.useCase.execute({
      ...request.body,
      ip: request.ip,
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {}),
    });
    setSessionCookie(reply, result.token, this.isProduction);
    return response({ sessionId: result.sessionId });
  }
}

export class GoogleAuthenticationController {
  constructor(
    private readonly google: IGoogleOAuthClient | null,
    private readonly useCase: AuthenticateWithGoogleUseCase | null,
    private readonly callbackPath: string,
    private readonly webAppUrl: string,
    private readonly isProduction: boolean,
  ) {}

  start(_request: FastifyRequest, reply: FastifyReply) {
    if (!this.google)
      throw new ApiError("O login com Google não está configurado.", {
        statusCode: 503,
        code: "GOOGLE_OAUTH_NOT_CONFIGURED",
      });
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(64).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const cookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: "lax" as const,
      signed: true,
      path: this.callbackPath,
      maxAge: 10 * 60,
    };
    reply.setCookie(oauthStateCookie, state, cookieOptions);
    reply.setCookie(oauthVerifierCookie, verifier, cookieOptions);
    return reply.redirect(this.google.createAuthorizationUrl(state, challenge));
  }

  async callback(
    request: FastifyRequest<{ Querystring: GoogleCallbackQuery }>,
    reply: FastifyReply,
  ) {
    const stateCookie = request.cookies[oauthStateCookie];
    const verifierCookie = request.cookies[oauthVerifierCookie];
    const state = stateCookie ? request.unsignCookie(stateCookie) : null;
    const verifier = verifierCookie ? request.unsignCookie(verifierCookie) : null;
    reply.clearCookie(oauthStateCookie, { path: this.callbackPath });
    reply.clearCookie(oauthVerifierCookie, { path: this.callbackPath });
    if (!state?.valid || state.value !== request.query.state || !verifier?.valid)
      throw new ApiError("A tentativa de login com Google expirou ou é inválida.", {
        statusCode: 400,
        code: "GOOGLE_OAUTH_STATE_INVALID",
      });

    const loginUrl = new URL("/login", this.webAppUrl);
    if (request.query.error || !request.query.code) {
      loginUrl.searchParams.set("oauthError", "google");
      return reply.redirect(loginUrl.toString());
    }
    if (!this.useCase)
      throw new ApiError("O login com Google não está configurado.", {
        statusCode: 503,
        code: "GOOGLE_OAUTH_NOT_CONFIGURED",
      });

    try {
      const result = await this.useCase.execute({
        code: request.query.code,
        codeVerifier: verifier.value,
        ip: request.ip,
        ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {}),
      });
      setSessionCookie(reply, result.token, this.isProduction);
      return reply.redirect(new URL("/", this.webAppUrl).toString());
    } catch (error: unknown) {
      request.log.warn({ err: error }, "Google authentication failed");
      loginUrl.searchParams.set("oauthError", "google");
      return reply.redirect(loginUrl.toString());
    }
  }
}

export class ConfirmEmailController {
  constructor(private readonly useCase: ConfirmEmailUseCase) {}
  async handle(request: FastifyRequest<{ Body: TokenInput }>) {
    await this.useCase.execute(request.body.token);
    return response({ confirmed: true as const });
  }
}

export class ChangePasswordController {
  constructor(private readonly useCase: ChangePasswordUseCase) {}
  async handle(request: FastifyRequest<{ Body: ChangePasswordInput }>) {
    const token = request.cookies.finances_session;
    if (!token)
      throw new ApiError("Entre para continuar.", {
        statusCode: 401,
        code: "AUTHENTICATION_REQUIRED",
      });
    await this.useCase.execute(token, request.body.currentPassword, request.body.password);
    return response({ changed: true as const });
  }
}

export class ResendConfirmationController {
  constructor(private readonly useCase: ResendConfirmationUseCase) {}
  async handle(request: FastifyRequest<{ Body: EmailInput }>) {
    await this.useCase.execute(request.body.email);
    return response(
      { accepted: true as const },
      "Se a conta existir, enviaremos novas instruções.",
    );
  }
}

export class RequestPasswordResetController {
  constructor(private readonly useCase: RequestPasswordResetUseCase) {}
  async handle(request: FastifyRequest<{ Body: EmailInput }>) {
    await this.useCase.execute(request.body.email);
    return response({ accepted: true as const }, "Se a conta existir, enviaremos as instruções.");
  }
}

export class ResetPasswordController {
  constructor(private readonly useCase: ResetPasswordUseCase) {}
  async handle(request: FastifyRequest<{ Body: ResetPasswordInput }>) {
    await this.useCase.execute(request.body.token, request.body.password);
    return response({ changed: true as const });
  }
}
