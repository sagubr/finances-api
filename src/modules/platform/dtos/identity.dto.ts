import { publicIdSchema } from "#/shared/validation/http-primitives.js";
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string().min(12).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().min(2).max(120),
  password: passwordSchema,
});
export const registerResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    userId: publicIdSchema,
    workspaceId: publicIdSchema,
    emailConfirmationRequired: z.boolean(),
  }),
  message: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const loginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ sessionId: publicIdSchema }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
export const confirmationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ confirmed: z.literal(true) }),
});
export type TokenInput = z.infer<typeof tokenSchema>;
export const emailBodySchema = z.object({ email: emailSchema });
export const resetSchema = tokenSchema.extend({ password: passwordSchema });
export const acceptedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ accepted: z.literal(true) }),
  message: z.string().optional(),
});
export const passwordResetResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ changed: z.literal(true) }),
});
export type EmailInput = z.infer<typeof emailBodySchema>;
export type ResetPasswordInput = z.infer<typeof resetSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: passwordSchema,
});
export const passwordChangedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ changed: z.literal(true) }),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const sessionIdParamsSchema = z.object({ id: publicIdSchema });
export const csrfResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ token: z.string() }),
});
export const currentSessionResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: publicIdSchema,
    user: z.object({
      id: publicIdSchema,
      email: z.string().email(),
      displayName: z.string(),
      emailConfirmed: z.boolean(),
    }),
    expiresAt: z.string().datetime(),
  }),
});
export const sessionListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(
      z.object({
        id: publicIdSchema,
        userAgent: z.string().nullable(),
        lastSeenAt: z.string().datetime(),
        createdAt: z.string().datetime(),
        current: z.boolean(),
      }),
    ),
  }),
});
export const workspaceSchema = z.object({
  id: publicIdSchema,
  name: z.string(),
  timezone: z.string(),
  baseCurrency: z.string().length(3),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});
export const workspaceResponseSchema = z.object({
  success: z.literal(true),
  data: workspaceSchema,
});
export const workspaceListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(workspaceSchema) }),
});

export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
