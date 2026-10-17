import {
  buildCkanMetacatalogRows,
  buildSocrataMetacatalogRow,
} from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import { describe, expect, it } from "vitest";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/open-data-metacatalog/configuredDrives";

const CKAN_DRIVE: ConfiguredDrive = {
  apiService: "ckan",
  baseUrl: "https://data.humdata.org",
  organizationName: "Humanitarian Data Exchange",
};

const SOCRATA_DRIVE: ConfiguredDrive = {
  apiService: "socrata",
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "NYC Open Data",
};

describe("buildCkanMetacatalogRows", () => {
  it("builds one row per readable resource", () => {
    const ckanPackage: CkanPackage = {
      id: "c3429f0e",
      name: "movement-range-maps",
      metadata_modified: "2025-11-19T10:29:46.280529",
      resources: [
        {
          id: "readme-1",
          name: "README.txt",
          format: "TXT",
          url: "https://data.humdata.org/dataset/x/resource/readme-1/download/readme.txt",
          url_type: "upload",
          size: 100,
          hash: "",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
        {
          id: "csv-1",
          name: "data.csv",
          format: "CSV",
          url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
          url_type: "upload",
          size: 200,
          hash: "abc",
          last_modified: "2026-01-01T00:00:00Z",
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    const rows = buildCkanMetacatalogRows({ drive: CKAN_DRIVE, ckanPackage });

    expect(rows).toEqual([
      {
        access_kind: "api_resource",
        api_service: "ckan",
        api_base_url: "https://data.humdata.org",
        external_dataset_id: "movement-range-maps",
        api_resource_id: "csv-1",
        api_resource_format: "CSV",
        display_name: "data.csv",
        external_organization_name: "Humanitarian Data Exchange",
      },
    ]);
  });

  it("returns no rows when the dataset has no readable resource", () => {
    const ckanPackage: CkanPackage = {
      id: "c3429f0e",
      name: "docs-only-dataset",
      metadata_modified: undefined,
      resources: [
        {
          id: "readme-1",
          name: "README.txt",
          format: "TXT",
          url: "https://data.humdata.org/dataset/x/resource/readme-1/download/readme.txt",
          url_type: "upload",
          size: 100,
          hash: "",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    expect(
      buildCkanMetacatalogRows({ drive: CKAN_DRIVE, ckanPackage }),
    ).toEqual([]);
  });
});

describe("buildSocrataMetacatalogRow", () => {
  it("builds one row, always formatted as csv", () => {
    const result: SocrataDiscoveryResult = {
      datasetId: "erm2-nwe9",
      name: "311 Service Requests from 2020 to Present",
      domain: "data.cityofnewyork.us",
    };

    expect(
      buildSocrataMetacatalogRow({ drive: SOCRATA_DRIVE, result }),
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
