import { createHdxListingDownload } from "@pipelines/hdx/download/createHdxListingDownload/createHdxListingDownload";
import { describe, expect, it, vi } from "vitest";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";

const HDX_BASE_URL = "https://data.humdata.org";
const RESOURCE_ID = "e3a18c4c-ec1b-457e-9f60-cee283c04e0c";
const RESOURCE_URL = `${HDX_BASE_URL}/dataset/5b89fc55/resource/e3a18c4c/download/op.csv`;

const LISTING = {
  id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
  apiBaseUrl: HDX_BASE_URL,
  apiResourceId: RESOURCE_ID,
  externalDatasetId: "hdx-hapi-operational-presence",
  apiResourceFormat: "CSV",
};

function _createHttp(resource: Record<string, unknown> = {}): OpenDataHttp {
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
              // Far over any relay limit: a copy reads any size.
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

describe("createHdxListingDownload", () => {
  it("downloads a CKAN file of any size as one file", async () => {
    const http = _createHttp();
    const createHttp = vi.fn(() => {
      return http;
    });

    const download = await createHdxListingDownload({ createHttp })({
      listing: LISTING,
    });

    expect(createHttp).toHaveBeenCalledWith(HDX_BASE_URL);
    expect(download).toEqual({
      paging: false,
      url: RESOURCE_URL,
      contentKind: "csv",
      sourceVersion: expect.stringContaining("abc123"),
    });
  });

  it("downloads a Parquet resource as Parquet", async () => {
    const http = _createHttp({ format: "Parquet" });

    const download = await createHdxListingDownload({
      createHttp: () => {
        return http;
      },
    })({ listing: { ...LISTING, apiResourceFormat: "Parquet" } });

    expect(download).toMatchObject({ paging: false, contentKind: "parquet" });
  });

  it("refuses a resource on another host", async () => {
    const http = _createHttp({ url: "https://elsewhere.example/op.csv" });

    await expect(
      createHdxListingDownload({
        createHttp: () => {
          return http;
        },
      })({ listing: LISTING }),
    ).rejects.toThrow();
  });
});
