import type { CopyBudgetsUseCase } from "#/modules/planning/application/use-cases/copy-budgets.use-case.js";
import type { CreateBudgetUseCase } from "#/modules/planning/application/use-cases/create-budget.use-case.js";
import type { DeleteBudgetUseCase } from "#/modules/planning/application/use-cases/delete-budget.use-case.js";
import type { GetBudgetProgressUseCase } from "#/modules/planning/application/use-cases/get-budget-progress.use-case.js";
import type { ListBudgetsUseCase } from "#/modules/planning/application/use-cases/list-budgets.use-case.js";
import type { UpdateBudgetUseCase } from "#/modules/planning/application/use-cases/update-budget.use-case.js";
import type {
  BudgetInput,
  BudgetPatch,
  BudgetProgressQuery,
  BudgetQuery,
  CopyBudgetsInput,
  ResourceIdParams,
  VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
export class ListBudgetsController {
  constructor(private readonly useCase: ListBudgetsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: BudgetQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateBudgetController {
  constructor(private readonly useCase: CreateBudgetUseCase) {}
  async handle(request: FastifyRequest<{ Body: BudgetInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class UpdateBudgetController {
  constructor(private readonly useCase: UpdateBudgetUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: BudgetPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteBudgetController {
  constructor(private readonly useCase: DeleteBudgetUseCase) {}
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
export class CopyBudgetsController {
  constructor(private readonly useCase: CopyBudgetsUseCase) {}
  async handle(
    request: FastifyRequest<{ Body: CopyBudgetsInput; Headers: { "idempotency-key": string } }>,
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
export class GetBudgetProgressController {
  constructor(private readonly useCase: GetBudgetProgressUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: BudgetProgressQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
