export type ActiveSession = Readonly<{
  internalId: bigint;
  publicId: string;
  userId: bigint;
  userPublicId: string;
  email: string;
  displayName: string;
  isEmailConfirmed: boolean;
  absoluteExpiresAt: Date;
}>;

export type SessionSummary = Readonly<{
  id: string;
  userAgent: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}>;

export type WorkspaceSummary = Readonly<{
  id: string;
  name: string;
  timezone: string;
  baseCurrency: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
}>;

export type Credential = Readonly<{ userId: bigint; passwordHash: string }>;
export type IdentityUser = Readonly<{ internalId: bigint; publicId: string }>;
export type RegisterUserInput = Readonly<{
  email: string;
  displayName: string;
  passwordHash: string;
  userPublicId: string;
  workspacePublicId: string;
  workspaceName: string;
  emailToken: Omit<CreateEmailTokenInput, "userId">;
  userRegisteredEventId: string;
  workspaceCreatedEventId: string;
  correlationId: string;
}>;
export type RegisteredUser = Readonly<{ userId: string; workspaceId: string }>;
export type CreateEmailTokenInput = Readonly<{
  publicId: string;
  userId: bigint;
  userPublicId: string;
  purpose: "EMAIL_CONFIRMATION" | "PASSWORD_RESET";
  tokenHash: string;
  tokenCiphertext: string;
  expiresAt: Date;
  eventId: string;
  correlationId: string;
}>;
export type CreateSessionInput = Readonly<{
  publicId: string;
  userId: bigint;
  tokenHash: string;
  familyId: string;
  userAgent?: string;
  ipHash: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}>;

export interface IIdentityRepository {
  registerUser(input: RegisterUserInput): Promise<RegisteredUser | null>;
  findCredentialByEmail(email: string): Promise<Credential | null>;
  countRecentFailedLoginAttempts(emailHash: string, ipHash: string, since: Date): Promise<number>;
  recordLoginAttempt(emailHash: string, ipHash: string, succeeded: boolean): Promise<void>;
  createSession(input: CreateSessionInput): Promise<void>;
  confirmEmail(tokenHash: string): Promise<boolean>;
  getPasswordHash(userId: bigint): Promise<string | null>;
  changePassword(userId: bigint, currentSessionId: bigint, passwordHash: string): Promise<void>;
  findUserForEmail(email: string, requireUnconfirmed: boolean): Promise<IdentityUser | null>;
  createEmailToken(input: CreateEmailTokenInput): Promise<void>;
  resetPassword(tokenHash: string, passwordHash: string): Promise<boolean>;
  resolveActiveSession(tokenHash: string): Promise<ActiveSession | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  listSessions(userId: bigint, currentSessionId: bigint): Promise<readonly SessionSummary[]>;
  revokeSession(userId: bigint, sessionPublicId: string): Promise<void>;
  listWorkspaces(userId: bigint): Promise<readonly WorkspaceSummary[]>;
  findWorkspace(userId: bigint, workspacePublicId: string): Promise<WorkspaceSummary | null>;
}
