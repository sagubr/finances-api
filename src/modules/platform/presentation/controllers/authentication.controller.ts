import type { AuthenticateUserUseCase } from "#/modules/platform/application/use-cases/authenticate-user.use-case.js";
import type { ChangePasswordUseCase } from "#/modules/platform/application/use-cases/change-password.use-case.js";
import type { ConfirmEmailUseCase } from "#/modules/platform/application/use-cases/confirm-email.use-case.js";
import type { RegisterUserUseCase } from "#/modules/platform/application/use-cases/register-user.use-case.js";
import type { RequestPasswordResetUseCase } from "#/modules/platform/application/use-cases/request-password-reset.use-case.js";
import type { ResendConfirmationUseCase } from "#/modules/platform/application/use-cases/resend-confirmation.use-case.js";
import type { ResetPasswordUseCase } from "#/modules/platform/application/use-cases/reset-password.use-case.js";
import type {
  ChangePasswordInput,
  EmailInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  TokenInput,
} from "#/modules/platform/dtos/identity.dto.js";
import { ApiError } from "#/shared/http/api.error.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

const absoluteSessionDurationSeconds = 30 * 24 * 60 * 60;

export class RegisterController {
  constructor(private readonly useCase: RegisterUserUseCase) {}

  async handle(request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) {
    const registered = await this.useCase.execute(request.body);
    return reply
      .status(201)
      .send(response(registered, "Conta criada. Confira seu e-mail para confirmar o cadastro."));
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
    reply.setCookie("finances_session", result.token, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: absoluteSessionDurationSeconds,
    });
    return response({ sessionId: result.sessionId });
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
