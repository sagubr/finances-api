import type { CancelDeletionUseCase } from "#/modules/operations/application/use-cases/cancel-deletion.use-case.js";
import type { CreateConsentUseCase } from "#/modules/operations/application/use-cases/create-consent.use-case.js";
import type { CreatePrivacyDownloadTokenUseCase } from "#/modules/operations/application/use-cases/create-privacy-download-token.use-case.js";
import type { DownloadPrivacyExportUseCase } from "#/modules/operations/application/use-cases/download-privacy-export.use-case.js";
import type { GetBillingUsageUseCase } from "#/modules/operations/application/use-cases/get-billing-usage.use-case.js";
import type { GetPrivacyExportUseCase } from "#/modules/operations/application/use-cases/get-privacy-export.use-case.js";
import type { GetSubscriptionUseCase } from "#/modules/operations/application/use-cases/get-subscription.use-case.js";
import type { ListLegalDocumentsUseCase } from "#/modules/operations/application/use-cases/list-legal-documents.use-case.js";
import type { ListPlansUseCase } from "#/modules/operations/application/use-cases/list-plans.use-case.js";
import type { ListSensitiveAccessUseCase } from "#/modules/operations/application/use-cases/list-sensitive-access.use-case.js";
import type { OpenBillingProviderUseCase } from "#/modules/operations/application/use-cases/open-billing-provider.use-case.js";
import type { RequestDeletionUseCase } from "#/modules/operations/application/use-cases/request-deletion.use-case.js";
import type { RequestPrivacyExportUseCase } from "#/modules/operations/application/use-cases/request-privacy-export.use-case.js";
import type {
  ConsentInput,
  OperationIdParams,
  OperationsListQuery,
  PrivacyDownloadInput,
} from "#/modules/operations/dtos/operations.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
export class ListPlansController {
  constructor(private readonly useCase: ListPlansUseCase) {}
  async handle(request: FastifyRequest) {
    return response({
      items: [...(await this.useCase.execute(requireRequestContext(request.requestContext)))],
    });
  }
}
export class GetSubscriptionController {
  constructor(private readonly useCase: GetSubscriptionUseCase) {}
  async handle(request: FastifyRequest) {
    return response(await this.useCase.execute(requireRequestContext(request.requestContext)));
  }
}
export class GetBillingUsageController {
  constructor(private readonly useCase: GetBillingUsageUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: OperationsListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class OpenBillingProviderController {
  constructor(private readonly useCase: OpenBillingProviderUseCase) {}
  handle(request: FastifyRequest) {
    return this.useCase.execute(requireRequestContext(request.requestContext));
  }
}
export class ListLegalDocumentsController {
  constructor(private readonly useCase: ListLegalDocumentsUseCase) {}
  async handle(request: FastifyRequest) {
    return response({
      items: [...(await this.useCase.execute(requireRequestContext(request.requestContext)))],
    });
  }
}
export class CreateConsentController {
  constructor(private readonly useCase: CreateConsentUseCase) {}
  async handle(request: FastifyRequest<{ Body: ConsentInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class RequestPrivacyExportController {
  constructor(private readonly useCase: RequestPrivacyExportUseCase) {}
  async handle(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .status(202)
      .send(response(await this.useCase.execute(requireRequestContext(request.requestContext))));
  }
}
export class GetPrivacyExportController {
  constructor(private readonly useCase: GetPrivacyExportUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class CreatePrivacyDownloadTokenController {
  constructor(private readonly useCase: CreatePrivacyDownloadTokenUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class DownloadPrivacyExportController {
  constructor(private readonly useCase: DownloadPrivacyExportUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: OperationIdParams; Body: PrivacyDownloadInput }>,
    reply: FastifyReply,
  ) {
    const content = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body.token,
    );
    return reply
      .type("application/octet-stream")
      .header("content-disposition", `attachment; filename="privacy-${request.params.id}.json"`)
      .send(content);
  }
}
export class RequestDeletionController {
  constructor(private readonly useCase: RequestDeletionUseCase) {}
  async handle(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .status(202)
      .send(response(await this.useCase.execute(requireRequestContext(request.requestContext))));
  }
}
export class CancelDeletionController {
  constructor(private readonly useCase: CancelDeletionUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class ListSensitiveAccessController {
  constructor(private readonly useCase: ListSensitiveAccessUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: OperationsListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
