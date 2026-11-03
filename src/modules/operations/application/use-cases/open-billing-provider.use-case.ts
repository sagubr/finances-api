import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
export class OpenBillingProviderUseCase {
  execute(context: RequestContext): never {
    requireWorkspaceMutation(context);
    throw new ApplicationError("O provedor desta operação ainda não foi configurado.", {
      category: "unavailable",
      code: "PROVIDER_UNAVAILABLE",
    });
  }
}
