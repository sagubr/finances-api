import type { IGoogleOAuthClient } from "#/modules/platform/application/google-oauth.client.js";
import type { IIdentityRepository } from "#/modules/platform/application/ports/identity.repository.js";
import { AuthenticateWithGoogleUseCase } from "#/modules/platform/application/use-cases/authenticate-with-google.use-case.js";
import { describe, expect, it, vi } from "vitest";

const createFixture = (emailVerified = true) => {
  const google: IGoogleOAuthClient = {
    createAuthorizationUrl: vi.fn(),
    exchangeCode: vi.fn().mockResolvedValue({
      subject: "google-subject",
      email: "person@example.com",
      emailVerified,
      displayName: "Person Name",
    }),
  };
  const authenticateExternalIdentity = vi
    .fn<IIdentityRepository["authenticateExternalIdentity"]>()
    .mockResolvedValue(42n);
  const createSession = vi.fn<IIdentityRepository["createSession"]>();
  const repository = {
    authenticateExternalIdentity,
    createSession,
  } as unknown as IIdentityRepository;
  const ids = ["correlation", "user", "workspace", "registered", "created", "session", "family"];
  const useCase = new AuthenticateWithGoogleUseCase(
    repository,
    google,
    (value) => `hash:${value}`,
    () => "session-token",
    () => ids.shift() ?? "another-id",
    () => new Date("2026-11-09T12:00:00.000Z"),
  );
  return { useCase, google, authenticateExternalIdentity, createSession };
};

describe("Google authentication", () => {
  it("provisions a confirmed external identity and creates the regular application session", async () => {
    const { useCase, authenticateExternalIdentity, createSession } = createFixture();

    const result = await useCase.execute({
      code: "authorization-code",
      codeVerifier: "pkce-verifier",
      ip: "127.0.0.1",
      userAgent: "Browser",
    });

    expect(authenticateExternalIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        subject: "google-subject",
        email: "person@example.com",
        displayName: "Person Name",
      }),
    );
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42n,
        tokenHash: "hash:session-token",
        ipHash: "hash:127.0.0.1",
      }),
    );
    expect(result).toEqual({ token: "session-token", sessionId: "session" });
  });

  it("rejects an email Google has not verified before touching persistence", async () => {
    const { useCase, authenticateExternalIdentity, createSession } = createFixture(false);

    await expect(
      useCase.execute({
        code: "authorization-code",
        codeVerifier: "pkce-verifier",
        ip: "127.0.0.1",
      }),
    ).rejects.toMatchObject({ code: "GOOGLE_EMAIL_NOT_VERIFIED" });
    expect(authenticateExternalIdentity).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});
