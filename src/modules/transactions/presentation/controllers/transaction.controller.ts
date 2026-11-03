import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import type { ConfirmTransactionUseCase } from "#/modules/transactions/application/use-cases/confirm-transaction.use-case.js";
import type { CreateTransactionUseCase } from "#/modules/transactions/application/use-cases/create-transaction.use-case.js";
import type { CreateTransferUseCase } from "#/modules/transactions/application/use-cases/create-transfer.use-case.js";
import type { DeleteTransactionUseCase } from "#/modules/transactions/application/use-cases/delete-transaction.use-case.js";
import type { GetMonthlySummaryUseCase } from "#/modules/transactions/application/use-cases/get-monthly-summary.use-case.js";
import type { GetTransactionUseCase } from "#/modules/transactions/application/use-cases/get-transaction.use-case.js";
import type { ListTransactionsUseCase } from "#/modules/transactions/application/use-cases/list-transactions.use-case.js";
import type { RestoreTransactionUseCase } from "#/modules/transactions/application/use-cases/restore-transaction.use-case.js";
import type { RevertTransactionStatusUseCase } from "#/modules/transactions/application/use-cases/revert-transaction-status.use-case.js";
import type { SettleTransactionUseCase } from "#/modules/transactions/application/use-cases/settle-transaction.use-case.js";
import type { UpdateTransactionUseCase } from "#/modules/transactions/application/use-cases/update-transaction.use-case.js";
import type {
  ListTransactionsQuery,
  ResourceIdParams,
  TransactionInput,
  TransactionPatch,
  TransferInput,
  VersionInput,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

type IdempotencyHeaders = Readonly<{ "idempotency-key": string }>;

export class ListTransactionsController {
  constructor(private readonly useCase: ListTransactionsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: ListTransactionsQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class GetTransactionController {
  constructor(private readonly useCase: GetTransactionUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class CreateTransactionController {
  constructor(private readonly useCase: CreateTransactionUseCase) {}
  async handle(
    request: FastifyRequest<{ Body: TransactionInput; Headers: IdempotencyHeaders }>,
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
export class UpdateTransactionController {
  constructor(private readonly useCase: UpdateTransactionUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: TransactionPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class ConfirmTransactionController {
  constructor(private readonly useCase: ConfirmTransactionUseCase) {}
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
export class SettleTransactionController {
  constructor(private readonly useCase: SettleTransactionUseCase) {}
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
export class RevertTransactionStatusController {
  constructor(private readonly useCase: RevertTransactionStatusUseCase) {}
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
export class DeleteTransactionController {
  constructor(private readonly useCase: DeleteTransactionUseCase) {}
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
export class RestoreTransactionController {
  constructor(private readonly useCase: RestoreTransactionUseCase) {}
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
export class CreateTransferController {
  constructor(private readonly useCase: CreateTransferUseCase) {}
  async handle(
    request: FastifyRequest<{ Body: TransferInput; Headers: IdempotencyHeaders }>,
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
export class GetMonthlySummaryController {
  constructor(private readonly useCase: GetMonthlySummaryUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: { month: string } }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.query.month,
      ),
    );
  }
}
