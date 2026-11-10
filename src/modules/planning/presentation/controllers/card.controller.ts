import type { CloseCardStatementUseCase } from "#/modules/planning/application/use-cases/close-card-statement.use-case.js";
import type { CreateCardPurchaseUseCase } from "#/modules/planning/application/use-cases/create-card-purchase.use-case.js";
import type { CreateCreditCardUseCase } from "#/modules/planning/application/use-cases/create-credit-card.use-case.js";
import type { DeleteCardPurchaseUseCase } from "#/modules/planning/application/use-cases/delete-card-purchase.use-case.js";
import type { DeleteCreditCardUseCase } from "#/modules/planning/application/use-cases/delete-credit-card.use-case.js";
import type { GetCardStatementUseCase } from "#/modules/planning/application/use-cases/get-card-statement.use-case.js";
import type { ListCardStatementsUseCase } from "#/modules/planning/application/use-cases/list-card-statements.use-case.js";
import type { ListCreditCardsUseCase } from "#/modules/planning/application/use-cases/list-credit-cards.use-case.js";
import type { PayCardStatementUseCase } from "#/modules/planning/application/use-cases/pay-card-statement.use-case.js";
import type { ReopenCardStatementUseCase } from "#/modules/planning/application/use-cases/reopen-card-statement.use-case.js";
import type { UpdateCardPurchaseUseCase } from "#/modules/planning/application/use-cases/update-card-purchase.use-case.js";
import type { UpdateCreditCardUseCase } from "#/modules/planning/application/use-cases/update-credit-card.use-case.js";
import type {
  CardInput,
  CardPatch,
  CardPurchaseInput,
  CardPurchaseParams,
  CardPurchasePatch,
  PlanningListQuery,
  ResourceIdParams,
  StatementPaymentInput,
  VersionInput,
} from "#/modules/planning/dtos/planning.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
type KeyHeaders = { "idempotency-key": string };
export class ListCreditCardsController {
  constructor(private readonly useCase: ListCreditCardsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: PlanningListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateCreditCardController {
  constructor(private readonly useCase: CreateCreditCardUseCase) {}
  async handle(request: FastifyRequest<{ Body: CardInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class UpdateCreditCardController {
  constructor(private readonly useCase: UpdateCreditCardUseCase) {}
  async handle(request: FastifyRequest<{ Params: ResourceIdParams; Body: CardPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteCreditCardController {
  constructor(private readonly useCase: DeleteCreditCardUseCase) {}
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
export class CreateCardPurchaseController {
  constructor(private readonly useCase: CreateCardPurchaseUseCase) {}
  async handle(
    request: FastifyRequest<{
      Params: ResourceIdParams;
      Body: CardPurchaseInput;
      Headers: KeyHeaders;
    }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body,
      request.headers["idempotency-key"],
    );
    return reply.status(201).send(response(item));
  }
}
export class UpdateCardPurchaseController {
  constructor(private readonly useCase: UpdateCardPurchaseUseCase) {}
  async handle(request: FastifyRequest<{ Params: CardPurchaseParams; Body: CardPurchasePatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.params.purchaseId,
        request.body,
      ),
    );
  }
}
export class DeleteCardPurchaseController {
  constructor(private readonly useCase: DeleteCardPurchaseUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: CardPurchaseParams; Body: VersionInput }>,
    reply: FastifyReply,
  ) {
    await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.params.purchaseId,
      request.body.expectedVersion,
    );
    return reply.status(204).send();
  }
}
export class ListCardStatementsController {
  constructor(private readonly useCase: ListCardStatementsUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: ResourceIdParams; Querystring: PlanningListQuery }>,
  ) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.query,
      ),
    );
  }
}
export class GetCardStatementController {
  constructor(private readonly useCase: GetCardStatementUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: ResourceIdParams; Querystring: PlanningListQuery }>,
  ) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.query,
      ),
    );
  }
}
export class CloseCardStatementController {
  constructor(private readonly useCase: CloseCardStatementUseCase) {}
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
export class ReopenCardStatementController {
  constructor(private readonly useCase: ReopenCardStatementUseCase) {}
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
export class PayCardStatementController {
  constructor(private readonly useCase: PayCardStatementUseCase) {}
  async handle(
    request: FastifyRequest<{
      Params: ResourceIdParams;
      Body: StatementPaymentInput;
      Headers: KeyHeaders;
    }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body,
      request.headers["idempotency-key"],
    );
    return reply.status(201).send(response(item));
  }
}
