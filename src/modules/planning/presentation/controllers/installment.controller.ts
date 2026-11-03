import type { CreateInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/create-installment-plan.use-case.js";
import type { DeleteInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/delete-installment-plan.use-case.js";
import type { ListInstallmentPlansUseCase } from "#/modules/planning/application/use-cases/list-installment-plans.use-case.js";
import type { UpdateInstallmentPlanUseCase } from "#/modules/planning/application/use-cases/update-installment-plan.use-case.js";
import type {
  InstallmentPatch,
  InstallmentQuery,
  InstallmentsInput,
  ResourceIdParams,
  VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
export class ListInstallmentPlansController {
  constructor(private readonly useCase: ListInstallmentPlansUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: InstallmentQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateInstallmentPlanController {
  constructor(private readonly useCase: CreateInstallmentPlanUseCase) {}
  async handle(
    request: FastifyRequest<{ Body: InstallmentsInput; Headers: { "idempotency-key": string } }>,
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
export class UpdateInstallmentPlanController {
  constructor(private readonly useCase: UpdateInstallmentPlanUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: InstallmentPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteInstallmentPlanController {
  constructor(private readonly useCase: DeleteInstallmentPlanUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: ResourceIdParams; Body: VersionInput }>,
    reply: FastifyReply,
  ) {
    await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body.expectedVersion,
    );
    return reply.status(204).send();
  }
}
