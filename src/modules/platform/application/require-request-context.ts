import type { RequestContext } from "#/modules/platform/application/request-context.js";

export const requireRequestContext = (context: RequestContext | undefined): RequestContext => {
  if (!context) throw new Error("Request context middleware was not registered.");
  return context;
};
