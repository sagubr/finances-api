import { ApplicationError } from "#/shared/application/application.error.js";
import type { IIdentityRepository, WorkspaceSummary } from "../ports/identity.repository.js";
import type { SessionResolver } from "../session-resolver.js";

export class GetWorkspaceUseCase {
  constructor(
    private readonly sessionResolver: SessionResolver,
    private readonly repository: IIdentityRepository,
  ) {}

  async execute(token: string, workspacePublicId: string): Promise<WorkspaceSummary> {
    const session = await this.sessionResolver.resolve(token);
    const workspace = await this.repository.findWorkspace(session.userId, workspacePublicId);
    if (workspace) return workspace;
    throw new ApplicationError("Workspace não encontrado.", {
      category: "not-found",
      code: "WORKSPACE_NOT_FOUND",
    });
  }
}
