import type { IImportFileParser } from "#/modules/planning/application/ports/import-file-parser.js";
import type { IImportStorage } from "#/modules/planning/application/ports/import-storage.js";
import type { IImportUnitOfWork } from "#/modules/planning/application/ports/import.unit-of-work.js";
import type { RequestContext } from "#/modules/platform/application/request-context.js";
import { requireWorkspaceMutation } from "#/modules/platform/application/workspace-authorizer.js";
import { ApplicationError } from "#/shared/application/application.error.js";

export type ImportUpload = Readonly<{ buffer: Buffer; fileName: string; mimeType: string }>;

const allowedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const hasForbiddenFilenameCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || code === 127 || character === "/" || character === "\\";
  });

export class CreateImportPreviewUseCase {
  constructor(
    private readonly unitOfWork: IImportUnitOfWork,
    private readonly parser: IImportFileParser,
    private readonly storage: IImportStorage,
    private readonly generateId: () => string,
    private readonly checksum: (buffer: Buffer) => string,
  ) {}

  async execute(context: RequestContext, upload: ImportUpload) {
    requireWorkspaceMutation(context);
    const fileName = upload.fileName.trim();
    const supportedExtension = /\.(csv|xlsx)$/i.test(fileName);
    if (
      fileName.length === 0 ||
      fileName.length > 255 ||
      hasForbiddenFilenameCharacter(fileName) ||
      !supportedExtension ||
      !allowedMimeTypes.has(upload.mimeType.toLowerCase())
    )
      throw new ApplicationError("Envie um arquivo CSV ou XLSX válido.", {
        category: "validation",
        code: "IMPORT_FILE_INVALID",
      });
    const rows = this.parse(upload.buffer, fileName);
    if (rows.length === 0 || rows.length > 20_000)
      throw new ApplicationError("O arquivo deve conter entre 1 e 20.000 linhas.", {
        category: "validation",
        code: "IMPORT_ROW_LIMIT",
      });
    const batchId = this.generateId();
    const storageKey = await this.storage.write(context.workspacePublicId, batchId, upload.buffer);
    try {
      return await this.unitOfWork.run(context, (repository) =>
        repository.createPreview(
          {
            batchId,
            fileName,
            mimeType: upload.mimeType,
            storageKey,
            checksum: this.checksum(upload.buffer),
            fileSize: upload.buffer.length,
          },
          rows,
        ),
      );
    } catch (error: unknown) {
      await this.storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  private parse(buffer: Buffer, fileName: string) {
    try {
      return this.parser.parse(buffer, fileName);
    } catch {
      throw new ApplicationError("Não foi possível interpretar o arquivo enviado.", {
        category: "validation",
        code: "IMPORT_FILE_INVALID",
      });
    }
  }
}
