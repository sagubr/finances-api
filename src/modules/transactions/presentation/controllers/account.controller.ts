import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import type { CreateAccountUseCase } from "#/modules/transactions/application/use-cases/create-account.use-case.js";
import type { DeleteAccountUseCase } from "#/modules/transactions/application/use-cases/delete-account.use-case.js";
import type { ListAccountsUseCase } from "#/modules/transactions/application/use-cases/list-accounts.use-case.js";
import type { UpdateAccountUseCase } from "#/modules/transactions/application/use-cases/update-account.use-case.js";
import type {
  AccountInput,
  AccountPatch,
  ResourceIdParams,
  ResourceListQuery,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

type IdempotencyHeaders = Readonly<{ "idempotency-key": string }>;
type VersionInput = Readonly<{ expectedVersion: number }>;

export class ListAccountsController {
  constructor(private readonly useCase: ListAccountsUseCase) {}

  async handle(request: FastifyRequest<{ Querystring: ResourceListQuery }>, reply: FastifyReply) {
    const page = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.query,
    );
    return reply.send(response(page));
  }
}

export class CreateAccountController {
  constructor(private readonly useCase: CreateAccountUseCase) {}

  async handle(
    request: FastifyRequest<{ Body: AccountInput; Headers: IdempotencyHeaders }>,
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

export class UpdateAccountController {
  constructor(private readonly useCase: UpdateAccountUseCase) {}

  async handle(
    request: FastifyRequest<{ Params: ResourceIdParams; Body: AccountPatch }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute({
      context: requireRequestContext(request.requestContext),
      publicId: request.params.id,
      input: request.body,
    });
    return reply.send(response(item));
  }
}

export class DeleteAccountController {
  constructor(private readonly useCase: DeleteAccountUseCase) {}

  async handle(
    request: FastifyRequest<{ Params: ResourceIdParams; Body: VersionInput }>,
    reply: FastifyReply,
  ) {
    await this.useCase.execute({
      context: requireRequestContext(request.requestContext),
      publicId: request.params.id,
      expectedVersion: request.body.expectedVersion,
    });
    return reply.status(204).send();
  }
}

export type AccountControllers = Readonly<{
  list: ListAccountsController;
  create: CreateAccountController;
  update: UpdateAccountController;
  remove: DeleteAccountController;
}>;
