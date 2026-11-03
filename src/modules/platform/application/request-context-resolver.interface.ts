import type { RequestContext } from "#/modules/platform/application/request-context.js";

export type ResolveRequestContextInput = Readonly<{
  sessionTokenHash: string;
  workspacePublicId: string;
  requestId: string;
}>;

export interface IRequestContextResolver {
  resolve(input: ResolveRequestContextInput): Promise<RequestContext>;
}
