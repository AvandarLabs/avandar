import { resolveOpenDataSourceDownload } from "@pipeline-server/openDataParquetCache/resolveOpenDataSourceDownload/resolveOpenDataSourceDownload";
import { describe, expect, it, vi } from "vitest";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const CKAN_BASE_URL = "https://data.humdata.org";
const RESOURCE_ID = "e3a18c4c-ec1b-457e-9f60-cee283c04e0c";
const RESOURCE_URL = `${CKAN_BASE_URL}/dataset/5b89fc55/resource/e3a18c4c/download/op.csv`;

type ApiAccess = Extract<DataCatalogListing.Access, { kind: "api_resource" }>;

const CKAN_ACCESS: ApiAccess = {
  kind: "api_resource",
  apiService: "ckan",
  apiBaseUrl: CKAN_BASE_URL,
  externalDatasetId: "hdx-hapi-operational-presence",
  apiResourceId: RESOURCE_ID,
  expectedFormat: "CSV",
};

const SOCRATA_ACCESS: ApiAccess = {
  kind: "api_resource",
  apiService: "socrata",
  apiBaseUrl: "https://data.cityofnewyork.us/",
  externalDatasetId: "3h2n-5cm9",
  apiResourceId: "3h2n-5cm9",
  expectedFormat: "CSV",
};

function _ckanHttp(resource: Record<string, unknown> = {}): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      return {
        success: true,
        result: {
          id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
          name: "hdx-hapi-operational-presence",
          metadata_modified: "2026-08-18T08:44:07.360475",
          resources: [
            {
              id: RESOURCE_ID,
              name: "op.csv",
              format: "CSV",
              url: RESOURCE_URL,
              url_type: "upload",
              // Far over any relay limit: a cache build reads any size.
              size: 9_000_000_000,
              hash: "abc123",
              last_modified: undefined,
              mimetype: null,
              datastore_active: false,
              ...resource,
            },
          ],
        },
      };
    }),
    getBytes: vi.fn(),
  };
}

function _socrataHttp(rowCount: string): OpenDataHttp {
  return {
    get: vi.fn(async (url: string) => {
      if (url.includes("count(*)")) {
        return [{ count: rowCount }];
      }
      return { id: "3h2n-5cm9", name: "DOB Violations", rowsUpdatedAt: 1700 };
    }),
    getBytes: vi.fn(),
  };
}

describe("resolveOpenDataSourceDownload", () => {
  it("finds a CKAN file of any size", async () => {
    const download = await resolveOpenDataSourceDownload({
      access: CKAN_ACCESS,
      http: _ckanHttp(),
    });

    expect(download).toEqual({
      url: RESOURCE_URL,
      contentKind: "csv",
      sourceVersion: expect.stringContaining("abc123"),
    });
  });

  it("refuses a CKAN file on another host", async () => {
    await expect(
      resolveOpenDataSourceDownload({
        access: CKAN_ACCESS,
        http: _ckanHttp({ url: "https://elsewhere.example.org/op.csv" }),
      }),
    ).rejects.toMatchObject({
      failure: { code: "resource-host-mismatch" },
    });
  });

  it("asks Socrata for every row of the dataset", async () => {
    const download = await resolveOpenDataSourceDownload({
      access: SOCRATA_ACCESS,
      http: _socrataHttp("2477724"),
    });

    expect(download).toEqual({
      url: "https://data.cityofnewyork.us/resource/3h2n-5cm9.csv?%24limit=2477724",
      contentKind: "csv",
      sourceVersion: "socrata:rowsUpdatedAt:1700",
    });
  });

  it("calls a Socrata dataset with no rows empty", async () => {
    await expect(
      resolveOpenDataSourceDownload({
        access: SOCRATA_ACCESS,
        http: _socrataHttp("0"),
      }),
    ).rejects.toMatchObject({ failure: { code: "resource-empty" } });
  });
});
