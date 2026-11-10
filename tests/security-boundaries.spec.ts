import { assertRuntimeDatabaseRole } from "#/infrastructure/database/runtime-database-security.js";
import { AesGcmContentCipher } from "#/infrastructure/security/content-cipher.js";
import type { IIdentityRepository } from "#/modules/platform/application/ports/identity.repository.js";
import { AuthenticateUserUseCase } from "#/modules/platform/application/use-cases/authenticate-user.use-case.js";
import type { IExportStorage } from "#/modules/reports/application/ports/export-storage.js";
import type {
  IReportUnitOfWork,
  ReportWorkContext,
} from "#/modules/reports/application/ports/report.unit-of-work.js";
import { DownloadExportUseCase } from "#/modules/reports/application/use-cases/download-export.use-case.js";
import { toSafeErrorLog } from "#/shared/observability/safe-error-log.js";
import {
  createCursorPage,
  decodeCompositeCursor,
  encodeCompositeCursor,
} from "#/shared/pagination/cursor-pagination.js";
import { describe, expect, it, vi } from "vitest";

const createIdentityRepository = () => {
  const findCredentialByEmail = vi.fn<IIdentityRepository["findCredentialByEmail"]>();
  const countRecentFailedLoginAttemptsByIp = vi.fn<
    IIdentityRepository["countRecentFailedLoginAttemptsByIp"]
  >(() => Promise.resolve(0));
  const recordLoginAttempt = vi.fn<IIdentityRepository["recordLoginAttempt"]>();
  const createSession = vi.fn<IIdentityRepository["createSession"]>();
  const repository: IIdentityRepository = {
    registerUser: vi.fn(),
    authenticateExternalIdentity: vi.fn(),
    findCredentialByEmail,
    countRecentFailedLoginAttemptsByIp,
    recordLoginAttempt,
    createSession,
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
    countRecentFailedLoginAttemptsByIp,
    recordLoginAttempt,
    createSession,
  };
};

describe("security boundaries", () => {
  it("rejects privileged PostgreSQL runtime roles only in production", async () => {
    const inspect = vi.fn(() =>
      Promise.resolve({
        name: "postgres",
        isSuperuser: true,
        bypassesRls: true,
        ownsApplicationTables: true,
        unprotectedTenantTables: [],
      }),
    );

    await expect(assertRuntimeDatabaseRole("production", inspect)).rejects.toThrow(
      "must not be superuser",
    );
    await expect(assertRuntimeDatabaseRole("development", inspect)).resolves.toBeUndefined();
    expect(inspect).toHaveBeenCalledOnce();
  });

  it("accepts a restricted PostgreSQL production role", async () => {
    await expect(
      assertRuntimeDatabaseRole("production", () =>
        Promise.resolve({
          name: "finances_app",
          isSuperuser: false,
          bypassesRls: false,
          ownsApplicationTables: false,
          unprotectedTenantTables: [],
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects a runtime role that owns application tables", async () => {
    await expect(
      assertRuntimeDatabaseRole("production", () =>
        Promise.resolve({
          name: "finances_owner",
          isSuperuser: false,
          bypassesRls: false,
          ownsApplicationTables: true,
          unprotectedTenantTables: [],
        }),
      ),
    ).rejects.toThrow("own application tables");
  });

  it("rejects tenant tables without row-level security in production", async () => {
    await expect(
      assertRuntimeDatabaseRole("production", () =>
        Promise.resolve({
          name: "finances_app",
          isSuperuser: false,
          bypassesRls: false,
          ownsApplicationTables: false,
          unprotectedTenantTables: ["public.transactions"],
        }),
      ),
    ).rejects.toThrow("must enable row-level security");
  });

  it("removes messages, details and query values from error logs", () => {
    const error = Object.assign(new Error("Key (email)=(person@example.com) already exists"), {
      code: "23505",
      constraint: "users_email_unique",
      detail: "person@example.com",
      query: "insert into users values ('person@example.com')",
    });

    expect(toSafeErrorLog(error)).toEqual({
      name: "Error",
      code: "23505",
      constraint: "users_email_unique",
    });
    expect(JSON.stringify(toSafeErrorLog(error))).not.toContain("person@example.com");
  });

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
    const { repository, countRecentFailedLoginAttemptsByIp, findCredentialByEmail } =
      createIdentityRepository();
    countRecentFailedLoginAttemptsByIp.mockResolvedValue(10);
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
    expect(countRecentFailedLoginAttemptsByIp).toHaveBeenCalledWith(
      "hash:127.0.0.1",
      new Date("2026-11-02T11:45:00.000Z"),
    );
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

  it("does not create a session before the e-mail is confirmed", async () => {
    const { repository, findCredentialByEmail, recordLoginAttempt, createSession } =
      createIdentityRepository();
    findCredentialByEmail.mockResolvedValue({
      userId: 1n,
      passwordHash: "password-hash",
      isEmailConfirmed: false,
    });
    const verify = vi.fn(() => Promise.resolve(true));
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
    ).rejects.toMatchObject({ category: "unauthenticated", code: "INVALID_CREDENTIALS" });
    expect(recordLoginAttempt).toHaveBeenCalledWith(
      "hash:person@example.com",
      "hash:127.0.0.1",
      false,
    );
    expect(createSession).not.toHaveBeenCalled();
  });

  it("creates a session only for a confirmed identity with a valid password", async () => {
    const { repository, findCredentialByEmail, createSession } = createIdentityRepository();
    findCredentialByEmail.mockResolvedValue({
      userId: 1n,
      passwordHash: "password-hash",
      isEmailConfirmed: true,
    });
    const useCase = new AuthenticateUserUseCase(
      repository,
      () => Promise.resolve(true),
      (value) => `hash:${value}`,
      () => "token",
      () => crypto.randomUUID(),
      () => new Date("2026-11-02T12:00:00.000Z"),
    );

    await useCase.execute({
      email: "person@example.com",
      password: "password",
      ip: "127.0.0.1",
    });

    expect(createSession).toHaveBeenCalledOnce();
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
