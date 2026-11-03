import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";
export class CalculatePayrollUseCase {
  execute(context: RequestContext): never {
    requireWorkspaceMutation(context);
    throw new ApplicationError("Nenhum conjunto de regras trabalhistas aprovado está publicado.", {
      category: "unavailable",
      code: "PAYROLL_RULE_SET_UNAVAILABLE",
    });
  }
}
