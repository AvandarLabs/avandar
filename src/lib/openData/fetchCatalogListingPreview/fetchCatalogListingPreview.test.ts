import { describe, expect, it, vi } from "vitest";
import { fetchCatalogListingPreview } from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { CatalogListingPreviewDependencies } from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";

const LISTING_ID = "listing-1" as DataCatalogListing.Id;

const SNIFFED = {
  columns: [
    { column_name: "country", column_type: "VARCHAR" },
    { column_name: "report_date", column_type: "DATE" },
  ],
  previewRows: [{ country: "Chad", report_date: 1_700_000_000_000 }],
};

function _createDependencies(
  overrides: Partial<CatalogListingPreviewDependencies> = {},
): CatalogListingPreviewDependencies {
  return {
    fetchApiResource: vi.fn(),
    fetchParquetUrl: vi.fn(),
    sniffCsv: vi.fn().mockResolvedValue(SNIFFED),
    previewParquetBlob: vi.fn().mockResolvedValue(SNIFFED),
    ...overrides,
  };
}

describe("fetchCatalogListingPreview", () => {
  it("reads an API-backed CSV resource with the CSV sniffer", async () => {
    const dependencies = _createDependencies({
      fetchApiResource: vi.fn().mockResolvedValue({
        contentKind: "csv",
        bytes: new Uint8Array([97]),
      }),
    });

    const preview = await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        canonicalUrls: undefined,
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.fetchApiResource).toHaveBeenCalledWith(LISTING_ID);
    expect(dependencies.sniffCsv).toHaveBeenCalledWith(
      expect.objectContaining({ maxPreviewRows: 200, hasHeader: true }),
    );
    expect(dependencies.previewParquetBlob).not.toHaveBeenCalled();
    expect(preview.columnNames).toEqual(["country", "report_date"]);
    expect([...preview.dateColumnNames]).toEqual(["report_date"]);
    expect(preview.rows).toEqual(SNIFFED.previewRows);
  });

  it("reads an API-backed Parquet resource without the CSV sniffer", async () => {
    const dependencies = _createDependencies({
      fetchApiResource: vi.fn().mockResolvedValue({
        contentKind: "parquet",
        bytes: new Uint8Array([1]),
      }),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        canonicalUrls: undefined,
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.previewParquetBlob).toHaveBeenCalledWith(
      expect.objectContaining({ maxPreviewRows: 200 }),
    );
    expect(dependencies.sniffCsv).not.toHaveBeenCalled();
  });

  it("reads a pipeline listing from its Parquet URL", async () => {
    const dependencies = _createDependencies({
      fetchParquetUrl: vi.fn().mockResolvedValue(new Blob(["x"])),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "pipeline_parquet",
        canonicalUrls: ["https://example.org/page", "https://x.org/a.PARQUET"],
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.fetchParquetUrl).toHaveBeenCalledWith(
      "https://x.org/a.PARQUET",
    );
    expect(dependencies.previewParquetBlob).toHaveBeenCalled();
  });

  it("throws when a pipeline listing names no Parquet URL", async () => {
    await expect(
      fetchCatalogListingPreview({
        listing: {
          id: LISTING_ID,
          accessKind: "pipeline_parquet",
          canonicalUrls: undefined,
        },
        maxPreviewRows: 200,
        dependencies: _createDependencies(),
      }),
    ).rejects.toThrow(/Parquet URL/);
  });
});
