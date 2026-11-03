import { z } from "zod";

export const healthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ status: z.literal("ok") }),
});
