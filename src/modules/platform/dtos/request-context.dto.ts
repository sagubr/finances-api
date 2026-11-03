import { idempotencyKeySchema, publicIdSchema } from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const workspaceHeadersSchema = z.object({
  "x-workspace": publicIdSchema,
});

export const csrfHeadersSchema = z.object({
  "x-csrf-token": z.string().min(1).max(512),
});

export const workspaceMutationHeadersSchema = workspaceHeadersSchema.extend({
  "x-csrf-token": z.string().min(1).max(512),
});

export const workspaceIdempotencyHeadersSchema = workspaceHeadersSchema.extend({
  "idempotency-key": idempotencyKeySchema,
});

export const workspaceIdempotencyMutationHeadersSchema = workspaceIdempotencyHeadersSchema.extend({
  "x-csrf-token": z.string().min(1).max(512),
});

export type WorkspaceHeaders = z.infer<typeof workspaceHeadersSchema>;
export type CsrfHeaders = z.infer<typeof csrfHeadersSchema>;
export type WorkspaceMutationHeaders = z.infer<typeof workspaceMutationHeadersSchema>;
export type WorkspaceIdempotencyHeaders = z.infer<typeof workspaceIdempotencyHeadersSchema>;
export type WorkspaceIdempotencyMutationHeaders = z.infer<
  typeof workspaceIdempotencyMutationHeadersSchema
>;
