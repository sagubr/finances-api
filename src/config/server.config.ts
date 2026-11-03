import { env, type Environment } from "#/config/env.config.js";

export type ServerConfig = Readonly<{
  environment: Environment["NODE_ENV"];
  host: string;
  port: number;
  logLevel: Environment["LOG_LEVEL"];
  trustProxy: false | number;
}>;

export const createServerConfig = (value: Environment): ServerConfig => {
  return {
    environment: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    trustProxy: value.TRUST_PROXY_HOPS === 0 ? false : value.TRUST_PROXY_HOPS,
  };
};

export const serverConfig = createServerConfig(env);
