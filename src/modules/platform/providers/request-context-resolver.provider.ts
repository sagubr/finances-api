import { db } from "#/infrastructure/database/db.provider.js";
import { RequestContextResolver } from "#/modules/platform/infrastructure/authorization/request-context.resolver.js";

export const requestContextResolver = new RequestContextResolver(db);
