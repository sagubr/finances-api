import { response } from "#/shared/http/response.js";

export const healthController = {
  liveness: () => response({ status: "ok" as const }),
};
