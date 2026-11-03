import { z } from "zod";

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  data: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    requestId: z.string(),
  }),
});

export const noContentResponseSchema = z.null();
