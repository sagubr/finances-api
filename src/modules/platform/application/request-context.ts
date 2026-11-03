export type RequestContext = Readonly<{
  userId: bigint;
  userPublicId: string;
  sessionId: bigint;
  workspaceId: bigint;
  workspacePublicId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  requestId: string;
}>;
