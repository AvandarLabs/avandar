import { respondWithSampleFailure } from "@sbfn/open-data/respondWithSampleFailure/respondWithSampleFailure.ts";
import { describe, expect, it, vi } from "vitest";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";

const LISTING_ID = "5b89fc55-586d-485f-8526-3c7a9a1b0d90";

describe("respondWithSampleFailure", () => {
  it("marks the listing invalid and says why", async () => {
    const markInvalid = vi.fn(async () => {});

    const response = await respondWithSampleFailure({
      catalogListingId: LISTING_ID,
      error: new OpenDataAcquisitionFailed({
        code: "resource-empty",
        ckanResourceId: "r1",
      }),
      markInvalid,
    });

    expect([
      response.status,
      await response.json(),
      markInvalid.mock.calls,
    ]).toEqual([
      409,
      {
        error: {
          code: "resource-empty",
          invalidDatasetReason: "empty_dataset",
        },
      },
      [[{ catalogListingId: LISTING_ID, reason: "empty_dataset" }]],
    ]);
  });

  it("leaves the listing valid when the catalog's API is the one failing", async () => {
    const markInvalid = vi.fn(async () => {});

    const response = await respondWithSampleFailure({
      catalogListingId: LISTING_ID,
      error: new OpenDataAcquisitionFailed({
        code: "ckan-unreachable",
        action: "package_show",
      }),
      markInvalid,
    });

    expect([
      response.status,
      await response.json(),
      markInvalid.mock.calls,
    ]).toEqual([502, { error: { code: "ckan-unreachable" } }, []]);
  });
});
