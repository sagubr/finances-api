import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export const requireWorkspaceMutation = (context: RequestContext): void => {
  if (context.role !== "VIEWER") return;
  throw new ApplicationError("Seu papel não permite esta alteração.", {
    category: "forbidden",
    code: "CAPABILITY_DENIED",
  });
};

export const requireWorkspaceOwner = (context: RequestContext): void => {
  if (context.role === "OWNER") return;
  throw new ApplicationError("Esta operação exige o papel de proprietário.", {
    category: "forbidden",
    code: "CAPABILITY_DENIED",
  });
};
