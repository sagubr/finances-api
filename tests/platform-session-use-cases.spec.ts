import type { IIdentityRepository } from "#/modules/platform/application/ports/identity.repository.js";
import { LogoutUseCase } from "#/modules/platform/application/use-cases/logout.use-case.js";
import { RegisterUserUseCase } from "#/modules/platform/application/use-cases/register-user.use-case.js";
import { describe, expect, it, vi } from "vitest";

const createRepository = () => {
  const registerUser = vi.fn<IIdentityRepository["registerUser"]>();
  const revokeByTokenHash = vi.fn();
  const repository: IIdentityRepository = {
    registerUser,
    findCredentialByEmail: vi.fn(),
    countRecentFailedLoginAttemptsByIp: vi.fn(),
    recordLoginAttempt: vi.fn(),
    createSession: vi.fn(),
    confirmEmail: vi.fn(),
    getPasswordHash: vi.fn(),
    changePassword: vi.fn(),
    findUserForEmail: vi.fn(),
    createEmailToken: vi.fn(),
    resetPassword: vi.fn(),
    resolveActiveSession: vi.fn(),
    revokeByTokenHash,
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    listWorkspaces: vi.fn(),
    findWorkspace: vi.fn(),
  };
  return { repository, registerUser, revokeByTokenHash };
};

describe("platform session use cases", () => {
  it("does not access persistence when logout has no session cookie", async () => {
    const { repository, revokeByTokenHash } = createRepository();
    const useCase = new LogoutUseCase(repository, vi.fn());

    await useCase.execute(undefined);

    expect(revokeByTokenHash).not.toHaveBeenCalled();
  });

  it("hashes the opaque token before revoking a session", async () => {
    const { repository, revokeByTokenHash } = createRepository();
    const useCase = new LogoutUseCase(repository, () => "token-hash");

    await useCase.execute("opaque-token");

    expect(revokeByTokenHash).toHaveBeenCalledWith("token-hash");
  });

  it("creates an exclusive default workspace with a stable product name", async () => {
    const { repository, registerUser } = createRepository();
    registerUser.mockResolvedValue({
      userId: crypto.randomUUID(),
      workspaceId: crypto.randomUUID(),
      emailConfirmationRequired: true,
    });
    const identifiers = Array.from({ length: 10 }, () => crypto.randomUUID());
    const useCase = new RegisterUserUseCase(
      repository,
      () => Promise.resolve("password-hash"),
      () => "opaque-token",
      () => identifiers.shift() ?? crypto.randomUUID(),
      (value) => `hash:${value}`,
      (value) => `encrypted:${value}`,
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await useCase.execute({
      email: "owner@example.com",
      displayName: "Gustavo",
      password: "a-secure-password",
    });

    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Gustavo",
        workspaceName: "Minhas finanças",
      }),
    );
  });

  it("confirms a newly registered account when development auto-confirmation is enabled", async () => {
    const { repository, registerUser } = createRepository();
    registerUser.mockResolvedValue({
      userId: crypto.randomUUID(),
      workspaceId: crypto.randomUUID(),
      emailConfirmationRequired: false,
    });
    const identifiers = Array.from({ length: 10 }, () => crypto.randomUUID());
    const useCase = new RegisterUserUseCase(
      repository,
      () => Promise.resolve("password-hash"),
      () => "opaque-token",
      () => identifiers.shift() ?? crypto.randomUUID(),
      (value) => `hash:${value}`,
      (value) => `encrypted:${value}`,
      () => new Date("2026-11-03T12:00:00.000Z"),
      true,
    );

    await useCase.execute({
      email: "owner@example.com",
      displayName: "Gustavo",
      password: "a-secure-password",
    });

    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        emailConfirmedAt: new Date("2026-11-03T12:00:00.000Z"),
      }),
    );
    expect(registerUser.mock.calls[0]?.[0]).not.toHaveProperty("emailToken");
  });
});
