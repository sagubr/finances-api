import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import type { CreateCategoryUseCase } from "#/modules/transactions/application/use-cases/create-category.use-case.js";
import type { DeleteCategoryUseCase } from "#/modules/transactions/application/use-cases/delete-category.use-case.js";
import type { ListCategoriesUseCase } from "#/modules/transactions/application/use-cases/list-categories.use-case.js";
import type { UpdateCategoryUseCase } from "#/modules/transactions/application/use-cases/update-category.use-case.js";
import type {
  CategoryInput,
  CategoryPatch,
  ResourceListQuery,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

type IdempotencyHeaders = Readonly<{ "idempotency-key": string }>;

export class ListCategoriesController {
  constructor(private readonly useCase: ListCategoriesUseCase) {}

  async handle(request: FastifyRequest<{ Querystring: ResourceListQuery }>, reply: FastifyReply) {
    const page = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.query,
    );
    return reply.send(response(page));
  }
}

export class CreateCategoryController {
  constructor(private readonly useCase: CreateCategoryUseCase) {}

  async handle(
    request: FastifyRequest<{ Body: CategoryInput; Headers: IdempotencyHeaders }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute({
      context: requireRequestContext(request.requestContext),
      input: request.body,
      idempotencyKey: request.headers["idempotency-key"],
    });
    return reply.status(201).send(response(item));
  }
}

export class UpdateCategoryController {
  constructor(private readonly useCase: UpdateCategoryUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: { id: string }; Body: CategoryPatch }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body,
    );
    return reply.send(response(item));
  }
}

export class DeleteCategoryController {
  constructor(private readonly useCase: DeleteCategoryUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: { id: string }; Body: { expectedVersion: number } }>,
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

export type CategoryControllers = Readonly<{
  list: ListCategoriesController;
  create: CreateCategoryController;
  update: UpdateCategoryController;
  delete: DeleteCategoryController;
}>;
