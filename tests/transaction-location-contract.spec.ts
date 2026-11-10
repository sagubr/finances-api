import {
  transactionInputSchema,
  transactionLocationSchema,
  transactionMapQuerySchema,
  transactionMapSchema,
  transactionPatchSchema,
} from "#/modules/transactions/dtos/transaction.dto.js";
import { describe, expect, it } from "vitest";

const baseInput = {
  accountId: "019a4c64-9a81-7000-8000-000000000003",
  type: "EXPENSE" as const,
  status: "SETTLED" as const,
  amountCents: 1_000,
  currency: "BRL",
  description: "Mercado",
  occurredOn: "2026-11-09",
};

const deviceLocation = {
  latitude: -23.55052,
  longitude: -46.633308,
  accuracyMeters: 12.5,
  capturedAt: "2026-11-09T18:30:00.000Z",
  source: "DEVICE" as const,
};

describe("transaction location contracts", () => {
  it("accepts a device location on an expense", () => {
    expect(transactionInputSchema.parse({ ...baseInput, location: deviceLocation })).toMatchObject({
      location: deviceLocation,
    });
  });

  it("validates the competence map contract", () => {
    expect(transactionMapQuerySchema.parse({ month: "2026-11" })).toEqual({ month: "2026-11" });
    expect(
      transactionMapSchema.safeParse({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "018f6f26-7c9a-7d75-9b2f-8fc5f14b3811",
            geometry: { type: "Point", coordinates: [-46.63, -23.55] },
            properties: {
              transactionId: "018f6f26-7c9a-7d75-9b2f-8fc5f14b3811",
              accountId: "018f6f26-7c9a-7d75-9b2f-8fc5f14b3812",
              accountName: "Conta principal",
              categoryId: null,
              categoryName: null,
              categoryColor: null,
              description: "Café",
              amountCents: 1800,
              currency: "BRL",
              occurredOn: "2026-11-09",
              status: "CONFIRMED",
              sourceModule: null,
            },
          },
        ],
        summary: {
          transactionCount: 2,
          locatedCount: 1,
          unlocatedCount: 1,
          locatedAmountCents: 1800,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects location on income transactions", () => {
    const result = transactionInputSchema.safeParse({
      ...baseInput,
      type: "INCOME",
      location: deviceLocation,
    });

    expect(result.success).toBe(false);
  });

  it("rejects coordinates outside geographic bounds", () => {
    expect(transactionLocationSchema.safeParse({ ...deviceLocation, latitude: -91 }).success).toBe(
      false,
    );
    expect(transactionLocationSchema.safeParse({ ...deviceLocation, longitude: 181 }).success).toBe(
      false,
    );
  });

  it("does not allow device accuracy on an adjusted map pin", () => {
    expect(
      transactionLocationSchema.safeParse({ ...deviceLocation, source: "MAP_PIN" }).success,
    ).toBe(false);
    expect(
      transactionLocationSchema.safeParse({
        ...deviceLocation,
        source: "MAP_PIN",
        accuracyMeters: null,
      }).success,
    ).toBe(true);
  });

  it("uses null to explicitly remove a location on update", () => {
    expect(transactionPatchSchema.parse({ expectedVersion: 1, location: null })).toEqual({
      expectedVersion: 1,
      location: null,
    });
  });
});
