import type { CommitImportUseCase } from "#/modules/planning/application/use-cases/commit-import.use-case.js";
import type { CreateImportPreviewUseCase } from "#/modules/planning/application/use-cases/create-import-preview.use-case.js";
import type { GetImportBatchUseCase } from "#/modules/planning/application/use-cases/get-import-batch.use-case.js";
import type { ListImportRowsUseCase } from "#/modules/planning/application/use-cases/list-import-rows.use-case.js";
import type { RollbackImportUseCase } from "#/modules/planning/application/use-cases/rollback-import.use-case.js";
import type { UpdateImportRowUseCase } from "#/modules/planning/application/use-cases/update-import-row.use-case.js";
import type {
  CommitImportInput,
  ImportIdParams,
  ImportRowCorrection,
  ImportRowParams,
  ImportRowsQuery,
} from "#/modules/planning/dtos/import.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { ApiError } from "#/shared/http/api.error.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";

export class CreateImportPreviewController {
  constructor(private readonly useCase: CreateImportPreviewUseCase) {}
  async handle(request: FastifyRequest, reply: FastifyReply) {
    const file = await request.file();
    if (!file)
      throw new ApiError("Envie um arquivo CSV ou XLSX.", {
        statusCode: 400,
        code: "IMPORT_FILE_REQUIRED",
      });
    const item = await this.useCase.execute(requireRequestContext(request.requestContext), {
      buffer: await file.toBuffer(),
      fileName: file.filename,
      mimeType: file.mimetype,
    });
    return reply.status(202).send(response(item));
  }
}
export class GetImportBatchController {
  constructor(private readonly useCase: GetImportBatchUseCase) {}
  async handle(request: FastifyRequest<{ Params: ImportIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class ListImportRowsController {
  constructor(private readonly useCase: ListImportRowsUseCase) {}
  async handle(request: FastifyRequest<{ Params: ImportIdParams; Querystring: ImportRowsQuery }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.query,
      ),
    );
  }
}
export class UpdateImportRowController {
  constructor(private readonly useCase: UpdateImportRowUseCase) {}
  async handle(request: FastifyRequest<{ Params: ImportRowParams; Body: ImportRowCorrection }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.params.rowId,
        request.body,
      ),
    );
  }
}
export class CommitImportController {
  constructor(private readonly useCase: CommitImportUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: ImportIdParams; Body: CommitImportInput }>,
    reply: FastifyReply,
  ) {
    const item = await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body,
    );
    return reply.status(201).send(response(item));
  }
}
export class RollbackImportController {
  constructor(private readonly useCase: RollbackImportUseCase) {}
  async handle(request: FastifyRequest<{ Params: ImportIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
export class DownloadImportTemplateController {
  handle(reply: FastifyReply) {
    return reply
      .type("text/csv; charset=utf-8")
      .header("content-disposition", 'attachment; filename="finances-import-template.csv"')
      .send(
        "data;descricao;valor;tipo;conta_id;categoria_id\n2026-01-31;Exemplo;100,00;DESPESA;uuid-da-conta;uuid-da-categoria\n",
      );
  }
}
