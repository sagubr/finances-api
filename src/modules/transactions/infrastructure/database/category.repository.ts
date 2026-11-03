import type { TenantDatabase } from "#/infrastructure/database/tenant-unit-of-work.js";
import type { ICategoryRepository } from "#/modules/transactions/application/ports/category.repository.js";
import type { CategoryInput, CategoryPatch } from "#/modules/transactions/dtos/transaction.dto.js";
import { categories } from "#/modules/transactions/infrastructure/database/transactions.schema.js";
import { mapCategory } from "#/modules/transactions/mappers/transaction.mapper.js";
import { ApplicationError } from "#/shared/application/application.error.js";
import {
  createCursorPage,
  decodeCursor,
  type CursorPaginationQuery,
} from "#/shared/pagination/cursor-pagination.js";
import { and, desc, eq, lt, sql } from "drizzle-orm";

const categorySelection = {
  publicId: categories.publicId,
  name: categories.name,
  type: categories.type,
  color: categories.color,
  isDefault: categories.isDefault,
  active: categories.active,
  version: categories.version,
} as const;

export class CategoryRepository implements ICategoryRepository {
  constructor(
    private readonly database: TenantDatabase,
    private readonly workspaceId: bigint,
  ) {}

  async list(query: CursorPaginationQuery) {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database
      .select(categorySelection)
      .from(categories)
      .where(
        and(
          eq(categories.workspaceId, this.workspaceId),
          eq(categories.active, true),
          ...(cursor ? [lt(categories.publicId, cursor)] : []),
        ),
      )
      .orderBy(desc(categories.publicId))
      .limit(query.limit + 1);
    return createCursorPage(rows.map(mapCategory), query.limit);
  }

  async create(publicId: string, input: CategoryInput) {
    const rows = await this.database
      .insert(categories)
      .values({
        publicId,
        workspaceId: this.workspaceId,
        name: input.name,
        type: input.type,
        color: input.color ?? null,
      })
      .returning({
        publicId: categories.publicId,
        name: categories.name,
        type: categories.type,
        color: categories.color,
        isDefault: categories.isDefault,
        active: categories.active,
        version: categories.version,
      });

    const category = rows[0];
    if (!category) throw new Error("Category insert did not return a record.");
    return mapCategory(category);
  }

  async update(publicId: string, input: CategoryPatch) {
    const current = (
      await this.database
        .select({ type: categories.type })
        .from(categories)
        .where(
          and(
            eq(categories.workspaceId, this.workspaceId),
            eq(categories.publicId, publicId),
            eq(categories.active, true),
          ),
        )
        .limit(1)
    )[0];
    if (!current) return null;
    if (input.type !== current.type)
      throw new ApplicationError("O tipo da categoria não pode ser alterado após o cadastro.", {
        category: "validation",
        code: "CATEGORY_TYPE_IMMUTABLE",
      });
    const rows = await this.database
      .update(categories)
      .set({
        name: input.name,
        color: input.color ?? null,
        version: sql`${categories.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.workspaceId, this.workspaceId),
          eq(categories.publicId, publicId),
          eq(categories.version, input.expectedVersion),
          eq(categories.active, true),
          eq(categories.isDefault, false),
        ),
      )
      .returning({
        publicId: categories.publicId,
        name: categories.name,
        type: categories.type,
        color: categories.color,
        isDefault: categories.isDefault,
        active: categories.active,
        version: categories.version,
      });
    const category = rows[0];
    return category ? mapCategory(category) : null;
  }

  async deactivate(publicId: string, expectedVersion: number) {
    const rows = await this.database
      .update(categories)
      .set({
        active: false,
        version: sql`${categories.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.workspaceId, this.workspaceId),
          eq(categories.publicId, publicId),
          eq(categories.version, expectedVersion),
          eq(categories.active, true),
          eq(categories.isDefault, false),
        ),
      )
      .returning({ id: categories.id });
    return Boolean(rows[0]);
  }
}
