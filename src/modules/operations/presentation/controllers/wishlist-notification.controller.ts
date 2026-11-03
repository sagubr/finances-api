import type { CreateWishlistItemUseCase } from "#/modules/operations/application/use-cases/create-wishlist-item.use-case.js";
import type { DeleteWishlistItemUseCase } from "#/modules/operations/application/use-cases/delete-wishlist-item.use-case.js";
import type { ListNotificationsUseCase } from "#/modules/operations/application/use-cases/list-notifications.use-case.js";
import type { ListWishlistUseCase } from "#/modules/operations/application/use-cases/list-wishlist.use-case.js";
import type { PurchaseWishlistItemUseCase } from "#/modules/operations/application/use-cases/purchase-wishlist-item.use-case.js";
import type { ReadAllNotificationsUseCase } from "#/modules/operations/application/use-cases/read-all-notifications.use-case.js";
import type { ReadNotificationUseCase } from "#/modules/operations/application/use-cases/read-notification.use-case.js";
import type { UpdateWishlistItemUseCase } from "#/modules/operations/application/use-cases/update-wishlist-item.use-case.js";
import type {
  OperationIdParams,
  OperationsListQuery,
  WishlistInput,
  WishlistPatch,
  WishlistPurchaseInput,
} from "#/modules/operations/dtos/operations.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
export class ListWishlistController {
  constructor(private readonly useCase: ListWishlistUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: OperationsListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateWishlistItemController {
  constructor(private readonly useCase: CreateWishlistItemUseCase) {}
  async handle(request: FastifyRequest<{ Body: WishlistInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class UpdateWishlistItemController {
  constructor(private readonly useCase: UpdateWishlistItemUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams; Body: WishlistPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteWishlistItemController {
  constructor(private readonly useCase: DeleteWishlistItemUseCase) {}
  async handle(
    request: FastifyRequest<{
      Params: OperationIdParams;
      Body: { expectedVersion: number };
    }>,
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
export class PurchaseWishlistItemController {
  constructor(private readonly useCase: PurchaseWishlistItemUseCase) {}
  async handle(
    request: FastifyRequest<{
      Params: OperationIdParams;
      Body: WishlistPurchaseInput;
      Headers: { "idempotency-key": string };
    }>,
  ) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
        request.headers["idempotency-key"],
      ),
    );
  }
}
export class ListNotificationsController {
  constructor(private readonly useCase: ListNotificationsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: OperationsListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class ReadAllNotificationsController {
  constructor(private readonly useCase: ReadAllNotificationsUseCase) {}
  async handle(request: FastifyRequest) {
    return response(await this.useCase.execute(requireRequestContext(request.requestContext)));
  }
}
export class ReadNotificationController {
  constructor(private readonly useCase: ReadNotificationUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
