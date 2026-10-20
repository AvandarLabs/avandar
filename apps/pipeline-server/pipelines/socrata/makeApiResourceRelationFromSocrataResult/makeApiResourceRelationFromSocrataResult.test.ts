import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import { describe, expect, it } from "vitest";

describe("makeApiResourceRelationFromSocrataResult", () => {
  it("builds one CSV relation per dataset, dated by its updatedAt", () => {
    expect(
      makeApiResourceRelationFromSocrataResult({
        drive: {
          baseUrl: "https://data.cityofnewyork.us",
          organizationName: "City of New York",
        },
        result: {
          datasetId: "erm2-nwe9",
          name: "311 Service Requests",
          domain: "data.cityofnewyork.us",
          createdAt: "2011-10-10T00:00:00.000Z",
          updatedAt: "2026-10-19T08:30:00.000Z",
        },
      }),
    ).toEqual({
      kind: "api_resource",
      externalDatasetId: "erm2-nwe9",
      apiResourceId: "erm2-nwe9",
      apiResourceFormat: "CSV",
      displayName: "311 Service Requests",
      externalOrganizationName: "City of New York",
      sourceUpdatedAt: new Date("2026-10-19T08:30:00.000Z"),
    });
  });
});
