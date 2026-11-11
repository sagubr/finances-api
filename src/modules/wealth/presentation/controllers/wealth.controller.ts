import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import type { CalculatePayrollUseCase } from "#/modules/wealth/application/use-cases/calculate-payroll.use-case.js";
import type { CreateAssetValuationUseCase } from "#/modules/wealth/application/use-cases/create-asset-valuation.use-case.js";
import type { CreateAssetUseCase } from "#/modules/wealth/application/use-cases/create-asset.use-case.js";
import type { CreateOrderUseCase } from "#/modules/wealth/application/use-cases/create-order.use-case.js";
import type { DeleteAssetUseCase } from "#/modules/wealth/application/use-cases/delete-asset.use-case.js";
import type { DeleteOrderUseCase } from "#/modules/wealth/application/use-cases/delete-order.use-case.js";
import type { GetNetWorthUseCase } from "#/modules/wealth/application/use-cases/get-net-worth.use-case.js";
import type { GetQuoteUseCase } from "#/modules/wealth/application/use-cases/get-quote.use-case.js";
import type { ListAssetsUseCase } from "#/modules/wealth/application/use-cases/list-assets.use-case.js";
import type { ListInstrumentsUseCase } from "#/modules/wealth/application/use-cases/list-instruments.use-case.js";
import type { ListOrdersUseCase } from "#/modules/wealth/application/use-cases/list-orders.use-case.js";
import type { ListPositionsUseCase } from "#/modules/wealth/application/use-cases/list-positions.use-case.js";
import type { ResolveInstrumentUseCase } from "#/modules/wealth/application/use-cases/resolve-instrument.use-case.js";
import type { UpdateAssetUseCase } from "#/modules/wealth/application/use-cases/update-asset.use-case.js";
import type { UpdateOrderUseCase } from "#/modules/wealth/application/use-cases/update-order.use-case.js";
import type {
  AssetInput,
  AssetPatch,
  AssetValuationInput,
  InstrumentQuery,
  OrderInput,
  OrderPatch,
  ResolveInstrumentInput,
  VersionInput,
  WealthDateQuery,
  WealthIdParams,
  WealthListQuery,
} from "#/modules/wealth/dtos/wealth.dto.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export class ListInstrumentsController {
  constructor(private readonly useCase: ListInstrumentsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: InstrumentQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class ResolveInstrumentController {
  constructor(private readonly useCase: ResolveInstrumentUseCase) {}
  async handle(request: FastifyRequest<{ Body: ResolveInstrumentInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(
            requireRequestContext(request.requestContext),
            request.body.ticker,
          ),
        ),
      );
  }
}
export class GetQuoteController {
  constructor(private readonly useCase: GetQuoteUseCase) {}
  async handle(request: FastifyRequest<{ Params: WealthIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class ListOrdersController {
  constructor(private readonly useCase: ListOrdersUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: WealthListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class ListPositionsController {
  constructor(private readonly useCase: ListPositionsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: WealthListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateOrderController {
  constructor(private readonly useCase: CreateOrderUseCase) {}
  async handle(
    request: FastifyRequest<{ Body: OrderInput; Headers: { "idempotency-key": string } }>,
    reply: FastifyReply,
  ) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(
            requireRequestContext(request.requestContext),
            request.body,
            request.headers["idempotency-key"],
          ),
        ),
      );
  }
}
export class UpdateOrderController {
  constructor(private readonly useCase: UpdateOrderUseCase) {}
  async handle(request: FastifyRequest<{ Params: WealthIdParams; Body: OrderPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteOrderController {
  constructor(private readonly useCase: DeleteOrderUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: WealthIdParams; Body: VersionInput }>,
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
export class ListAssetsController {
  constructor(private readonly useCase: ListAssetsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: WealthListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateAssetController {
  constructor(private readonly useCase: CreateAssetUseCase) {}
  async handle(request: FastifyRequest<{ Body: AssetInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class UpdateAssetController {
  constructor(private readonly useCase: UpdateAssetUseCase) {}
  async handle(request: FastifyRequest<{ Params: WealthIdParams; Body: AssetPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteAssetController {
  constructor(private readonly useCase: DeleteAssetUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: WealthIdParams; Body: VersionInput }>,
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
export class CreateAssetValuationController {
  constructor(private readonly useCase: CreateAssetValuationUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: WealthIdParams; Body: AssetValuationInput }>,
    reply: FastifyReply,
  ) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(
            requireRequestContext(request.requestContext),
            request.params.id,
            request.body,
          ),
        ),
      );
  }
}
export class GetNetWorthController {
  constructor(private readonly useCase: GetNetWorthUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: WealthDateQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query.date),
    );
  }
}
export class CalculatePayrollController {
  constructor(private readonly useCase: CalculatePayrollUseCase) {}
  handle(request: FastifyRequest) {
    return this.useCase.execute(requireRequestContext(request.requestContext));
  }
}
