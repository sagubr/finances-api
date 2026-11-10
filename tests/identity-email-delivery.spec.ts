import type { IIdentityEmailRepository } from "#/modules/platform/application/ports/identity-email.repository.js";
import { SendIdentityEmailUseCase } from "#/modules/platform/application/use-cases/send-identity-email.use-case.js";
import { EmailService } from "#/shared/application/email.service.js";
import type { IEmailProvider } from "#/shared/application/ports/email.provider.js";
import { describe, expect, it, vi } from "vitest";

const createFixture = (purpose: "EMAIL_CONFIRMATION" | "PASSWORD_RESET") => {
  const send = vi.fn<IEmailProvider["send"]>(() => Promise.resolve());
  const findPendingByTokenId = vi.fn<IIdentityEmailRepository["findPendingByTokenId"]>(() =>
    Promise.resolve({
      email: "person@example.com",
      displayName: "Pessoa <Teste>",
      purpose,
      tokenCiphertext: "encrypted-token",
    }),
  );
  const repository: IIdentityEmailRepository = {
    findPendingByTokenId,
  };
  const useCase = new SendIdentityEmailUseCase(
    repository,
    new EmailService({ send }),
    () => "opaque-token",
    "https://app.example.com",
  );
  return { findPendingByTokenId, send, useCase };
};

describe("identity email delivery", () => {
  it("builds a confirmation link without coupling the use case to Resend", async () => {
    const { findPendingByTokenId, send, useCase } = createFixture("EMAIL_CONFIRMATION");

    await useCase.execute("event-id", { tokenId: "token-id" });

    expect(findPendingByTokenId).toHaveBeenCalledWith("token-id");
    const message = send.mock.calls[0]?.[0];
    expect(message).toMatchObject({
      to: "person@example.com",
      subject: "Confirme seu e-mail na Nummo",
      idempotencyKey: "identity-email/event-id",
    });
    expect(message?.text).toContain("https://app.example.com/confirm-email?token=opaque-token");
    expect(message?.html).toContain("Pessoa &lt;Teste&gt;");
  });

  it("builds the password reset link", async () => {
    const { send, useCase } = createFixture("PASSWORD_RESET");

    await useCase.execute("event-id", { tokenId: "token-id" });

    const message = send.mock.calls[0]?.[0];
    expect(message?.subject).toBe("Redefina sua senha da Nummo");
    expect(message?.text).toContain("https://app.example.com/reset-password?token=opaque-token");
  });

  it("does not send when the token is no longer pending", async () => {
    const { findPendingByTokenId, send, useCase } = createFixture("PASSWORD_RESET");
    findPendingByTokenId.mockResolvedValue(null);

    await useCase.execute("event-id", { tokenId: "token-id" });

    expect(send).not.toHaveBeenCalled();
  });

  it("rejects malformed outbox payloads", async () => {
    const { useCase } = createFixture("EMAIL_CONFIRMATION");

    await expect(useCase.execute("event-id", {})).rejects.toMatchObject({
      code: "IDENTITY_EMAIL_EVENT_INVALID",
    });
  });
});
