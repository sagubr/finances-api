import { db } from "#/infrastructure/database/db.provider.js";
import { SessionResolver } from "#/modules/platform/application/session-resolver.js";
import { GetCurrentSessionUseCase } from "#/modules/platform/application/use-cases/get-current-session.use-case.js";
import { GetWorkspaceUseCase } from "#/modules/platform/application/use-cases/get-workspace.use-case.js";
import { ListSessionsUseCase } from "#/modules/platform/application/use-cases/list-sessions.use-case.js";
import { ListWorkspacesUseCase } from "#/modules/platform/application/use-cases/list-workspaces.use-case.js";
import { LogoutUseCase } from "#/modules/platform/application/use-cases/logout.use-case.js";
import { RevokeSessionUseCase } from "#/modules/platform/application/use-cases/revoke-session.use-case.js";
import { IdentityRepository } from "#/modules/platform/infrastructure/database/identity.repository.js";
import {
  GetCsrfTokenController,
  GetCurrentSessionController,
  GetWorkspaceController,
  ListSessionsController,
  ListWorkspacesController,
  LogoutController,
  RevokeSessionController,
} from "#/modules/platform/presentation/controllers/session.controller.js";
import { createHash } from "node:crypto";

const repository = new IdentityRepository(db);
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
const sessionResolver = new SessionResolver(repository, hashToken);

export const sessionControllers = {
  csrf: new GetCsrfTokenController(),
  logout: new LogoutController(new LogoutUseCase(repository, hashToken)),
  current: new GetCurrentSessionController(new GetCurrentSessionUseCase(sessionResolver)),
  list: new ListSessionsController(new ListSessionsUseCase(sessionResolver, repository)),
  revoke: new RevokeSessionController(new RevokeSessionUseCase(sessionResolver, repository)),
  workspaces: new ListWorkspacesController(new ListWorkspacesUseCase(sessionResolver, repository)),
  workspace: new GetWorkspaceController(new GetWorkspaceUseCase(sessionResolver, repository)),
} as const;
