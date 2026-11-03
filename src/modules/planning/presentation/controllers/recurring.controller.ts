import type { CreateRecurringRuleUseCase } from "#/modules/planning/application/use-cases/create-recurring-rule.use-case.js";
import type { DeleteRecurringRuleUseCase } from "#/modules/planning/application/use-cases/delete-recurring-rule.use-case.js";
import type { ListRecurringRulesUseCase } from "#/modules/planning/application/use-cases/list-recurring-rules.use-case.js";
import type { PauseRecurringRuleUseCase } from "#/modules/planning/application/use-cases/pause-recurring-rule.use-case.js";
import type { ResumeRecurringRuleUseCase } from "#/modules/planning/application/use-cases/resume-recurring-rule.use-case.js";
import type { UpdateRecurringRuleUseCase } from "#/modules/planning/application/use-cases/update-recurring-rule.use-case.js";
import type {
  DeleteRecurringInput,
  PlanningListQuery,
  RecurringInput,
  RecurringPatch,
  ResourceIdParams,
  VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

type IdempotencyHeaders = Readonly<{ "idempotency-key": string }>;
export class ListRecurringRulesController {
  constructor(private readonly useCase: ListRecurringRulesUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: PlanningListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateRecurringRuleController {
  constructor(private readonly useCase: CreateRecurringRuleUseCase) {}
  async handle(
    request: FastifyRequest<{ Body: RecurringInput; Headers: IdempotencyHeaders }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.body,
      request.headers["idempotency-key"],
    );
    return reply.status(201).send(response(item));
  }
}
export class PauseRecurringRuleController {
  constructor(private readonly useCase: PauseRecurringRuleUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: VersionInput }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body.expectedVersion,
      ),
    );
  }
}
export class ResumeRecurringRuleController {
  constructor(private readonly useCase: ResumeRecurringRuleUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: VersionInput }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body.expectedVersion,
      ),
    );
  }
}
export class UpdateRecurringRuleController {
  constructor(private readonly useCase: UpdateRecurringRuleUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: RecurringPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteRecurringRuleController {
  constructor(private readonly useCase: DeleteRecurringRuleUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: DeleteRecurringInput }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
