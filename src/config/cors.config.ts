import { env, type Environment } from "#/config/env.config.js";

export type CorsConfig = Readonly<{
  corsAllowedOrigins: readonly string[];
}>;

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, "");

export const createCorsConfig = (value: Environment): CorsConfig => ({
  corsAllowedOrigins: value.CORS_ALLOWED_ORIGINS.split(",").map(normalizeOrigin).filter(Boolean),
});

export const corsConfig = createCorsConfig(env);

export const isAllowedOrigin = (
  origin: string | undefined,
  config: Readonly<CorsConfig & { environment: Environment["NODE_ENV"] }>,
): boolean => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (config.environment !== "production")
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
  return config.corsAllowedOrigins.includes(normalized);
};
