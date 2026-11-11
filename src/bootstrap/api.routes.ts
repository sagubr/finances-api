import { healthRoutes } from "#/modules/health/health.routes.js";
import { wishlistRoutes } from "#/modules/operations/presentation/routes/wishlist.routes.js";
import { budgetRoutes } from "#/modules/planning/presentation/routes/budget.routes.js";
import { cardRoutes } from "#/modules/planning/presentation/routes/card.routes.js";
import { importRoutes } from "#/modules/planning/presentation/routes/import.routes.js";
import { installmentRoutes } from "#/modules/planning/presentation/routes/installment.routes.js";
import { recurringRoutes } from "#/modules/planning/presentation/routes/recurring.routes.js";
import type { IRequestContextResolver } from "#/modules/platform/application/request-context-resolver.interface.js";
import { authenticationRoutes } from "#/modules/platform/presentation/routes/authentication.routes.js";
import { sessionRoutes } from "#/modules/platform/presentation/routes/session.routes.js";
import { reportRoutes } from "#/modules/reports/presentation/routes/report.routes.js";
import { accountRoutes } from "#/modules/transactions/presentation/routes/account.routes.js";
import { categoryRoutes } from "#/modules/transactions/presentation/routes/category.routes.js";
import { transactionRoutes } from "#/modules/transactions/presentation/routes/transaction.routes.js";
import { investmentRoutes } from "#/modules/wealth/presentation/routes/investment.routes.js";
import type { FastifyPluginAsync } from "fastify";

export type ApiRoutesOptions = Readonly<{
  requestContextResolver: IRequestContextResolver;
}>;

export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (app, options) => {
  const contextualOptions = { requestContextResolver: options.requestContextResolver };

  await app.register(healthRoutes);
  await app.register(authenticationRoutes);
  await app.register(sessionRoutes);
  await app.register(accountRoutes, contextualOptions);
  await app.register(categoryRoutes, contextualOptions);
  await app.register(transactionRoutes, contextualOptions);
  await app.register(budgetRoutes, contextualOptions);
  await app.register(importRoutes, contextualOptions);
  await app.register(cardRoutes, contextualOptions);
  await app.register(installmentRoutes, contextualOptions);
  await app.register(recurringRoutes, contextualOptions);
  await app.register(reportRoutes, contextualOptions);
  await app.register(wishlistRoutes, contextualOptions);
  await app.register(investmentRoutes, contextualOptions);
};
