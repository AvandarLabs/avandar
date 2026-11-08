import { createSocrataListingDownload } from "@pipelines/socrata/download/createSocrataListingDownload/createSocrataListingDownload";
import { describe, expect, it, vi } from "vitest";
import type { PagedListingDownload } from "@avandar/etl";

const LISTING = {
  id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
  apiBaseUrl: "https://data.example.gov/",
  apiResourceId: "abcd-1234",
  externalDatasetId: "abcd-1234",
  apiResourceFormat: "CSV",
};

function _createHttp(rowsUpdatedAt: readonly number[] = [1700000000]) {
  const versions = [...rowsUpdatedAt];
  return {
    get: vi.fn(async () => {
      return {
        id: "abcd-1234",
        name: "Cases",
        rowsUpdatedAt: versions.length > 1 ? versions.shift() : versions[0],
        columns: [
          { fieldName: "county", dataTypeName: "text" },
          { fieldName: "cases", dataTypeName: "number" },
          { fieldName: "is_confirmed", dataTypeName: "checkbox" },
          { fieldName: "reported_on", dataTypeName: "calendar_date" },
          { fieldName: "location", dataTypeName: "point" },
          { fieldName: "notes", dataTypeName: "text", flags: ["hidden"] },
          { fieldName: ":@computed_region_abcd", dataTypeName: "number" },
        ],
      };
    }),
    getBytes: vi.fn(),
  };
}

async function _createPagedDownload(
  http: ReturnType<typeof _createHttp>,
): Promise<PagedListingDownload> {
  const download = await createSocrataListingDownload({ http })({
    listing: LISTING,
    pageRows: 100_000,
  });
  if (!download.paging) {
    throw new Error("Expected a paged download.");
  }
  return download;
}

function _readQuery(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

describe("createSocrataListingDownload", () => {
  it("reads the dataset's metadata once, from its own portal", async () => {
    const http = _createHttp();

    await _createPagedDownload(http);

    expect(http.get).toHaveBeenCalledExactlyOnceWith(
      "https://data.example.gov/api/views/abcd-1234.json",
    );
  });

  it("declares each exported column's type from the dataset's schema", async () => {
    const download = await _createPagedDownload(_createHttp());

    expect(download.columns).toEqual([
      { name: "county", dataType: "VARCHAR" },
      { name: "cases", dataType: "DOUBLE" },
      { name: "is_confirmed", dataType: "BOOLEAN" },
      { name: "reported_on", dataType: "TIMESTAMP" },
      { name: "location", dataType: "VARCHAR" },
    ]);
    expect(download.sourceVersion).toBe("socrata:rowsUpdatedAt:1700000000");
  });

  it("pages through the rows in row id order", async () => {
    const download = await _createPagedDownload(_createHttp());

    const firstPageUrl = download.buildPageUrl(undefined);

    expect(firstPageUrl).toMatch(
      /^https:\/\/data\.example\.gov\/resource\/abcd-1234\.csv\?/,
    );
    expect(download.cursorColumn).toBe(":id");
    expect(_readQuery(firstPageUrl)).toEqual({
      $select: ":id,county,cases,is_confirmed,reported_on,location",
      $order: ":id",
      $limit: "100000",
    });
  });

  it("asks for the rows after the last row of the previous page", async () => {
    const download = await _createPagedDownload(_createHttp());

    const pageUrl = download.buildPageUrl("row-ab'cd.ef");

    expect(_readQuery(pageUrl).$where).toBe(":id > 'row-ab''cd.ef'");
  });

  it("reads the freshness token again when asked", async () => {
    const download = await _createPagedDownload(
      _createHttp([1700000000, 1700000999]),
    );

    await expect(download.readSourceVersion()).resolves.toBe(
      "socrata:rowsUpdatedAt:1700000999",
    );
  });

  it("refuses to plan a paged download with no page size", async () => {
    await expect(
      createSocrataListingDownload({ http: _createHttp() })({
        listing: LISTING,
      }),
    ).rejects.toThrow("pageRows");
  });
});
