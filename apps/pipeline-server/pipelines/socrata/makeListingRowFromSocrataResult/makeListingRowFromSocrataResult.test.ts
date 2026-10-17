import { makeListingRowFromSocrataResult } from "@pipelines/socrata/makeListingRowFromSocrataResult/makeListingRowFromSocrataResult";
import { describe, expect, it } from "vitest";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

const SOCRATA_DRIVE: ConfiguredDrive = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "NYC Open Data",
};

describe("makeListingRowFromSocrataResult", () => {
  it("builds one row, always formatted as csv", () => {
    const result: SocrataDiscoveryResult = {
      datasetId: "erm2-nwe9",
      name: "311 Service Requests from 2020 to Present",
      domain: "data.cityofnewyork.us",
    };

    expect(
      makeListingRowFromSocrataResult({ drive: SOCRATA_DRIVE, result }),
    ).toEqual({
      access_kind: "api_resource",
      api_service: "socrata",
      api_base_url: "https://data.cityofnewyork.us",
      external_dataset_id: "erm2-nwe9",
      api_resource_id: "erm2-nwe9",
      api_resource_format: "CSV",
      display_name: "311 Service Requests from 2020 to Present",
      external_organization_name: "NYC Open Data",
    });
  });
});
