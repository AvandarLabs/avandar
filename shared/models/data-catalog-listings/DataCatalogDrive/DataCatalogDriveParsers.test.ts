import { describe, expect, it } from "vitest";
import { DataCatalogDriveParsers } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDriveParsers.ts";

describe("DataCatalogDriveParsers", () => {
  it("reads a drive's labels, with unused levels as undefined", () => {
    expect(
      DataCatalogDriveParsers.fromDBReadToModelRead({
        id: "6f7e2c1a-0000-4000-8000-000000000001",
        created_at: "2026-11-06T00:00:00+00:00",
        updated_at: "2026-11-06T00:00:00+00:00",
        pipeline_name: "socrata",
        drive_key: "https://data.cityofnewyork.us",
        organization1_label: "City",
        organization2_label: "Agency",
        organization3_label: null,
        organization4_label: null,
      }),
    ).toEqual({
      id: "6f7e2c1a-0000-4000-8000-000000000001",
      createdAt: "2026-11-06T00:00:00+00:00",
      updatedAt: "2026-11-06T00:00:00+00:00",
      pipelineName: "socrata",
      driveKey: "https://data.cityofnewyork.us",
      organization1Label: "City",
      organization2Label: "Agency",
      organization3Label: undefined,
      organization4Label: undefined,
    });
  });
});
