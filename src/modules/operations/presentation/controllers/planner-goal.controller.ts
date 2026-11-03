import type { CreateActivityUseCase } from "#/modules/operations/application/use-cases/create-activity.use-case.js";
import type { CreateGoalCheckinUseCase } from "#/modules/operations/application/use-cases/create-goal-checkin.use-case.js";
import type { CreateGoalUseCase } from "#/modules/operations/application/use-cases/create-goal.use-case.js";
import type { DeleteActivityUseCase } from "#/modules/operations/application/use-cases/delete-activity.use-case.js";
import type { DeleteGoalUseCase } from "#/modules/operations/application/use-cases/delete-goal.use-case.js";
import type { GetGoalProgressUseCase } from "#/modules/operations/application/use-cases/get-goal-progress.use-case.js";
import type { GetPlannerWeekUseCase } from "#/modules/operations/application/use-cases/get-planner-week.use-case.js";
import type { ListActivitiesUseCase } from "#/modules/operations/application/use-cases/list-activities.use-case.js";
import type { ListGoalsUseCase } from "#/modules/operations/application/use-cases/list-goals.use-case.js";
import type { SavePlannerTemplateUseCase } from "#/modules/operations/application/use-cases/save-planner-template.use-case.js";
import type { UpdateActivityUseCase } from "#/modules/operations/application/use-cases/update-activity.use-case.js";
import type { UpdateGoalUseCase } from "#/modules/operations/application/use-cases/update-goal.use-case.js";
import type {
  ActivityInput,
  ActivityPatch,
  GoalCheckinInput,
  GoalInput,
  GoalPatch,
  OperationIdParams,
  OperationsListQuery,
  PlannerWeekQuery,
  SlotsInput,
} from "#/modules/operations/dtos/operations.dto.js";
import { requireRequestContext } from "#/modules/platform/application/require-request-context.js";
import { response } from "#/shared/http/response.js";
import type { FastifyReply, FastifyRequest } from "fastify";
export class ListActivitiesController {
  constructor(private readonly useCase: ListActivitiesUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: OperationsListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateActivityController {
  constructor(private readonly useCase: CreateActivityUseCase) {}
  async handle(request: FastifyRequest<{ Body: ActivityInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class UpdateActivityController {
  constructor(private readonly useCase: UpdateActivityUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams; Body: ActivityPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteActivityController {
  constructor(private readonly useCase: DeleteActivityUseCase) {}
  async handle(
    request: FastifyRequest<{
      Params: OperationIdParams;
      Body: { expectedVersion: number };
    }>,
    reply: FastifyReply,
  ) {
    await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body.expectedVersion,
    );
    return reply.status(204).send();
  }
}
export class SavePlannerTemplateController {
  constructor(private readonly useCase: SavePlannerTemplateUseCase) {}
  async handle(request: FastifyRequest<{ Body: SlotsInput }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
    );
  }
}
export class GetPlannerWeekController {
  constructor(private readonly useCase: GetPlannerWeekUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: PlannerWeekQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query.date),
    );
  }
}
export class ListGoalsController {
  constructor(private readonly useCase: ListGoalsUseCase) {}
  async handle(request: FastifyRequest<{ Querystring: OperationsListQuery }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.query),
    );
  }
}
export class CreateGoalController {
  constructor(private readonly useCase: CreateGoalUseCase) {}
  async handle(request: FastifyRequest<{ Body: GoalInput }>, reply: FastifyReply) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(requireRequestContext(request.requestContext), request.body),
        ),
      );
  }
}
export class UpdateGoalController {
  constructor(private readonly useCase: UpdateGoalUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams; Body: GoalPatch }>) {
    return response(
      await this.useCase.execute(
        requireRequestContext(request.requestContext),
        request.params.id,
        request.body,
      ),
    );
  }
}
export class DeleteGoalController {
  constructor(private readonly useCase: DeleteGoalUseCase) {}
  async handle(
    request: FastifyRequest<{
      Params: OperationIdParams;
      Body: { expectedVersion: number };
    }>,
    reply: FastifyReply,
  ) {
    await this.useCase.execute(
      requireRequestContext(request.requestContext),
      request.params.id,
      request.body.expectedVersion,
    );
    return reply.status(204).send();
  }
}
export class CreateGoalCheckinController {
  constructor(private readonly useCase: CreateGoalCheckinUseCase) {}
  async handle(
    request: FastifyRequest<{ Params: OperationIdParams; Body: GoalCheckinInput }>,
    reply: FastifyReply,
  ) {
    return reply
      .status(201)
      .send(
        response(
          await this.useCase.execute(
            requireRequestContext(request.requestContext),
            request.params.id,
            request.body,
          ),
        ),
      );
  }
}
export class GetGoalProgressController {
  constructor(private readonly useCase: GetGoalProgressUseCase) {}
  async handle(request: FastifyRequest<{ Params: OperationIdParams }>) {
    return response(
      await this.useCase.execute(requireRequestContext(request.requestContext), request.params.id),
    );
  }
}
