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
    fetchCopyPart: vi.fn(),
    fetchCsvSample: vi.fn(),
    fetchParquetUrl: vi.fn(),
    sniffCsv: vi.fn().mockResolvedValue(SNIFFED),
    previewParquetBlob: vi.fn().mockResolvedValue(SNIFFED),
    ...overrides,
  };
}

describe("fetchCatalogListingPreview", () => {
  it("reads an API-backed CSV listing from the start of its file", async () => {
    const dependencies = _createDependencies({
      fetchCsvSample: vi.fn().mockResolvedValue("country,report_date\n"),
    });

    const preview = await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        apiResourceFormat: "csv",
        canonicalUrls: undefined,
        parquetCacheFolderPath: undefined,
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.fetchCsvSample).toHaveBeenCalledWith(LISTING_ID);
    expect(dependencies.fetchCopyPart).not.toHaveBeenCalled();
    expect(dependencies.sniffCsv).toHaveBeenCalledWith(
      expect.objectContaining({ maxPreviewRows: 200, hasHeader: true }),
    );
    expect(dependencies.previewParquetBlob).not.toHaveBeenCalled();
    expect(preview.columnNames).toEqual(["country", "report_date"]);
    expect(preview.dateColumnNames).toEqual(["report_date"]);
    expect(preview.rows).toEqual(SNIFFED.previewRows);
    // The preview is a persisted query. A Set would come back as {}, and the
    // grid would crash the next time the listing opened.
    expect(JSON.parse(JSON.stringify(preview)).dateColumnNames).toEqual([
      "report_date",
    ]);
  });

  it("reads an API-backed CSV listing from its stored Parquet copy instead of the API", async () => {
    const partBlob = new Blob(["part"]);
    const dependencies = _createDependencies({
      fetchCopyPart: vi.fn().mockResolvedValue(partBlob),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        apiResourceFormat: "csv",
        canonicalUrls: undefined,
        parquetCacheFolderPath: "catalog-cache/listing-1/build-1",
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.fetchCopyPart).toHaveBeenCalledWith(
      "catalog-cache/listing-1/build-1/part-00000.parquet",
    );
    expect(dependencies.previewParquetBlob).toHaveBeenCalledWith({
      parquetBlob: partBlob,
      maxPreviewRows: 200,
    });
    expect(dependencies.fetchCsvSample).not.toHaveBeenCalled();
  });

  it("reads the API sample of a stored CSV listing when a column recheck asks for it", async () => {
    const dependencies = _createDependencies({
      fetchCsvSample: vi.fn().mockResolvedValue("country,report_date\n"),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        apiResourceFormat: "csv",
        canonicalUrls: undefined,
        parquetCacheFolderPath: "catalog-cache/listing-1/build-1",
      },
      maxPreviewRows: 200,
      source: "live-sample",
      dependencies,
    });

    expect(dependencies.fetchCsvSample).toHaveBeenCalledWith(LISTING_ID);
    expect(dependencies.fetchCopyPart).not.toHaveBeenCalled();
  });

  it("reads an API-backed OData listing from its CSV sample", async () => {
    const dependencies = _createDependencies({
      fetchCsvSample: vi.fn().mockResolvedValue("country,report_date\n"),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        apiResourceFormat: "odata",
        canonicalUrls: undefined,
        parquetCacheFolderPath: undefined,
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.fetchCsvSample).toHaveBeenCalledWith(LISTING_ID);
    expect(dependencies.fetchCopyPart).not.toHaveBeenCalled();
  });

  it("reads any other API-backed listing from the first part of its Parquet copy", async () => {
    const partBlob = new Blob(["part"]);
    const dependencies = _createDependencies({
      fetchCopyPart: vi.fn().mockResolvedValue(partBlob),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "api_resource",
        apiResourceFormat: "PARQUET",
        canonicalUrls: undefined,
        parquetCacheFolderPath: "catalog-cache/listing-1/build-1",
      },
      maxPreviewRows: 200,
      dependencies,
    });

    expect(dependencies.fetchCopyPart).toHaveBeenCalledWith(
      "catalog-cache/listing-1/build-1/part-00000.parquet",
    );
    expect(dependencies.previewParquetBlob).toHaveBeenCalledWith({
      parquetBlob: partBlob,
      maxPreviewRows: 200,
    });
    expect(dependencies.sniffCsv).not.toHaveBeenCalled();
  });

  it("throws, without starting a build, when a non-CSV API-backed listing has no copy yet", async () => {
    const dependencies = _createDependencies();

    await expect(
      fetchCatalogListingPreview({
        listing: {
          id: LISTING_ID,
          accessKind: "api_resource",
          apiResourceFormat: "PARQUET",
          canonicalUrls: undefined,
          parquetCacheFolderPath: undefined,
        },
        maxPreviewRows: 200,
        dependencies,
      }),
    ).rejects.toThrow(/no Parquet copy/);
    expect(dependencies.fetchCopyPart).not.toHaveBeenCalled();
  });

  it("reads a pipeline listing from its Parquet URL", async () => {
    const dependencies = _createDependencies({
      fetchParquetUrl: vi.fn().mockResolvedValue(new Blob(["x"])),
    });

    await fetchCatalogListingPreview({
      listing: {
        id: LISTING_ID,
        accessKind: "pipeline_parquet",
        apiResourceFormat: undefined,
        canonicalUrls: ["https://example.org/page", "https://x.org/a.PARQUET"],
        parquetCacheFolderPath: undefined,
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
          apiResourceFormat: undefined,
          canonicalUrls: undefined,
          parquetCacheFolderPath: undefined,
        },
        maxPreviewRows: 200,
        dependencies: _createDependencies(),
      }),
    ).rejects.toThrow(/Parquet URL/);
  });
});
