import { AesGcmContentCipher } from "#/infrastructure/security/content-cipher.js";
import type { IIdentityRepository } from "#/modules/platform/application/ports/identity.repository.js";
import { AuthenticateUserUseCase } from "#/modules/platform/application/use-cases/authenticate-user.use-case.js";
import type { IExportStorage } from "#/modules/reports/application/ports/export-storage.js";
import type {
  IReportUnitOfWork,
  ReportWorkContext,
} from "#/modules/reports/application/ports/report.unit-of-work.js";
import { DownloadExportUseCase } from "#/modules/reports/application/use-cases/download-export.use-case.js";
import {
  createCursorPage,
  decodeCompositeCursor,
  encodeCompositeCursor,
} from "#/shared/pagination/cursor-pagination.js";
import { describe, expect, it, vi } from "vitest";

const createIdentityRepository = () => {
  const findCredentialByEmail = vi.fn<IIdentityRepository["findCredentialByEmail"]>();
  const countRecentFailedLoginAttempts = vi.fn<
    IIdentityRepository["countRecentFailedLoginAttempts"]
  >(() => Promise.resolve(0));
  const recordLoginAttempt = vi.fn<IIdentityRepository["recordLoginAttempt"]>();
  const repository: IIdentityRepository = {
    registerUser: vi.fn(),
    findCredentialByEmail,
    countRecentFailedLoginAttempts,
    recordLoginAttempt,
    createSession: vi.fn(),
    confirmEmail: vi.fn(),
    getPasswordHash: vi.fn(),
    changePassword: vi.fn(),
    findUserForEmail: vi.fn(),
    createEmailToken: vi.fn(),
    resetPassword: vi.fn(),
    resolveActiveSession: vi.fn(),
    revokeByTokenHash: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    listWorkspaces: vi.fn(),
    findWorkspace: vi.fn(),
  };
  return {
    repository,
    findCredentialByEmail,
    countRecentFailedLoginAttempts,
    recordLoginAttempt,
  };
};

describe("security boundaries", () => {
  it("encrypts content with authentication and rejects tampering", () => {
    const cipher = new AesGcmContentCipher("a sufficiently long application secret");
    const encrypted = cipher.encrypt('{"sensitive":true}');
    const last = encrypted.at(-1);
    const tampered = `${encrypted.slice(0, -1)}${last === "A" ? "B" : "A"}`;

    expect(encrypted).not.toContain("sensitive");
    expect(cipher.decrypt(encrypted)).toBe('{"sensitive":true}');
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it("creates bounded opaque pages without losing composite cursor values", () => {
    const page = createCursorPage(
      [
        { key: "api|calls", period: "2026-10" },
        { key: "storage", period: "2026-10" },
      ],
      1,
      (item) => encodeCompositeCursor(item.key, item.period),
    );

    expect(page.items).toHaveLength(1);
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(decodeCompositeCursor(page.pageInfo.nextCursor ?? undefined, 2)).toEqual([
      "api|calls",
      "2026-10",
    ]);
  });

  it("stops rate-limited login attempts before credential lookup", async () => {
    const { repository, countRecentFailedLoginAttempts, findCredentialByEmail } =
      createIdentityRepository();
    countRecentFailedLoginAttempts.mockResolvedValue(10);
    const verify = vi.fn(() => Promise.resolve(false));
    const useCase = new AuthenticateUserUseCase(
      repository,
      verify,
      (value) => `hash:${value}`,
      () => "token",
      () => crypto.randomUUID(),
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({ email: "person@example.com", password: "password", ip: "127.0.0.1" }),
    ).rejects.toMatchObject({ category: "rate-limit", code: "LOGIN_RATE_LIMITED" });
    expect(findCredentialByEmail).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("performs password work even when the identity does not exist", async () => {
    const { repository, findCredentialByEmail, recordLoginAttempt } = createIdentityRepository();
    findCredentialByEmail.mockResolvedValue(null);
    const verify = vi.fn(() => Promise.resolve(false));
    const useCase = new AuthenticateUserUseCase(
      repository,
      verify,
      (value) => `hash:${value}`,
      () => "token",
      () => crypto.randomUUID(),
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await expect(
      useCase.execute({ email: "missing@example.com", password: "password", ip: "127.0.0.1" }),
    ).rejects.toMatchObject({ category: "unauthenticated", code: "INVALID_CREDENTIALS" });
    expect(verify).toHaveBeenCalledWith(undefined, "password");
    expect(recordLoginAttempt).toHaveBeenCalledWith(
      "hash:missing@example.com",
      "hash:127.0.0.1",
      false,
    );
  });

  it("does not consume a report token when stored content fails integrity", async () => {
    const consumeDownloadToken = vi.fn();
    const reports = {
      findDownloadArtifact: vi.fn(() =>
        Promise.resolve({
          storageKey: "workspace/report.json",
          checksum: "invalid",
          format: "JSON" as const,
        }),
      ),
      consumeDownloadToken,
    } as unknown as ReportWorkContext["reports"];
    const unitOfWork: IReportUnitOfWork = {
      run: <T>(
        _context: Parameters<IReportUnitOfWork["run"]>[0],
        work: (scope: ReportWorkContext) => Promise<T>,
      ) => work({ reports }),
    };
    const storage: IExportStorage = {
      write: vi.fn(),
      read: vi.fn(() => Promise.resolve('{"valid":true}')),
    };
    const useCase = new DownloadExportUseCase(
      unitOfWork,
      storage,
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await expect(
      useCase.execute(
        {
          userId: 1n,
          userPublicId: crypto.randomUUID(),
          sessionId: 2n,
          workspaceId: 3n,
          workspacePublicId: crypto.randomUUID(),
          role: "OWNER",
          requestId: "request-1",
        },
        crypto.randomUUID(),
        "a".repeat(32),
      ),
    ).rejects.toMatchObject({ category: "conflict", code: "EXPORT_INTEGRITY_FAILURE" });
    expect(consumeDownloadToken).not.toHaveBeenCalled();
  });
});
