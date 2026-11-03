import { subscriptionSchema } from "#/modules/operations/dtos/operations.dto.js";
import { subscriptionStatus } from "#/modules/operations/infrastructure/database/operations.schema.js";
import { describe, expect, it } from "vitest";

describe("subscription contract", () => {
  it("keeps the persisted and public statuses aligned", () => {
    const publicStatuses = subscriptionSchema.shape.status.options;

    expect(subscriptionStatus.enumValues).toEqual(publicStatuses);
  });
});
