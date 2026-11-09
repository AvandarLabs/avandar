import { buildParquetCachePartName } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { fetchOpenDataColumnTypeSample } from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import { downloadOpenDataParquetPart } from "@/lib/openData/fetchOpenDataParquetCopy/fetchOpenDataParquetCopy";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type {
  DuckDbColumnSchema,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";

/** The first rows of a catalog listing's data, ready for a data grid. */
export type CatalogListingPreview = {
  /** Every column, in the source's order. */
  columnNames: readonly string[];
  /**
   * The columns DuckDB read as dates or times. Their values arrive as epoch
   * milliseconds, so the grid has to be told to format them.
   */
  dateColumnNames: ReadonlySet<string>;
  rows: readonly UnknownRow[];
};

type SniffedPreview = Readonly<{
  columns: readonly DuckDbColumnSchema[];
  previewRows: UnknownRow[];
}>;

/** The reads a preview needs. Injected so a test runs without a network. */
export type CatalogListingPreviewDependencies = {
  /** Downloads one part of a listing's Parquet copy from Storage. */
  fetchCopyPart: (partPath: string) => Promise<Blob>;
  /**
   * Reads the start of an API-backed CSV or OData listing's data, as CSV
   * text.
   */
  fetchCsvSample: (catalogListingId: DataCatalogListing.Id) => Promise<string>;
  fetchParquetUrl: (url: string) => Promise<Blob>;
  sniffCsv: (options: {
    file: File;
    maxPreviewRows: number;
    hasHeader: boolean;
  }) => Promise<SniffedPreview>;
  previewParquetBlob: (options: {
    parquetBlob: Blob;
    maxPreviewRows: number;
  }) => Promise<SniffedPreview>;
};

async function _fetchParquetUrl(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open data Parquet download failed: ${response.status}`);
  }
  return await response.blob();
}

const DEFAULT_DEPENDENCIES: CatalogListingPreviewDependencies = {
  fetchCopyPart: downloadOpenDataParquetPart,
  fetchCsvSample: async (catalogListingId) => {
    return (await fetchOpenDataColumnTypeSample(catalogListingId)).csvText;
  },
  fetchParquetUrl: _fetchParquetUrl,
  sniffCsv: (options) => {
    return DuckDbClient.sniffCsv(options);
  },
  previewParquetBlob: (options) => {
    return DuckDbClient.previewParquetBlob(options);
  },
};

function _sniffCsvFile(
  dependencies: CatalogListingPreviewDependencies,
  csvFile: Blob | string | Uint8Array<ArrayBuffer>,
  maxPreviewRows: number,
): Promise<SniffedPreview> {
  return dependencies.sniffCsv({
    file: new File([csvFile], "catalog-preview.csv", { type: "text/csv" }),
    maxPreviewRows,
    hasHeader: true,
  });
}

function _toPreview(sniffed: SniffedPreview): CatalogListingPreview {
  return {
    columnNames: sniffed.columns.map((column) => {
      return column.column_name;
    }),
    dateColumnNames: new Set(
      sniffed.columns
        .filter((column) => {
          return DuckDbDataTypeUtils.isDateOrTimestamp(column.column_type);
        })
        .map((column) => {
          return column.column_name;
        }),
    ),
    rows: sniffed.previewRows,
  };
}

/**
 * The resource formats whose preview reads the column-type sample route,
 * which returns CSV text, rather than the listing's Parquet copy.
 */
const CSV_SAMPLE_FORMATS: ReadonlySet<string> = new Set(["CSV", "ODATA"]);

function _isReadFromCsvSample(apiResourceFormat: string | undefined): boolean {
  return (
    apiResourceFormat !== undefined &&
    CSV_SAMPLE_FORMATS.has(apiResourceFormat.toUpperCase())
  );
}

/**
 * Reads the first `maxPreviewRows` rows of a catalog listing's data, without
 * adding the listing to a workspace.
 *
 * An API-backed CSV listing is read from the start of its file, the same
 * sample its column types are verified from, so a source of any size can be
 * previewed. An OData listing is read from the same sample route, which
 * writes its first rows as CSV. Any other API-backed listing is read from
 * the first part of its Parquet copy, and has no preview until a workspace
 * adds it and the copy is built: browsing never starts a build. A pipeline
 * listing is read from the Parquet URL its catalog row names. Either way
 * DuckDB reads only the preview's rows and nothing is kept once they are
 * read.
 *
 * @param options.listing The listing to preview.
 * @param options.maxPreviewRows How many rows to read at most.
 * @param options.dependencies Replaces the network and DuckDB, for tests.
 * @throws When the listing's data cannot be fetched or read.
 */
export async function fetchCatalogListingPreview(
  options: Readonly<{
    listing: Pick<
      DataCatalogListing.T,
      | "id"
      | "accessKind"
      | "apiResourceFormat"
      | "canonicalUrls"
      | "parquetCacheFolderPath"
    >;
    maxPreviewRows: number;
    dependencies?: CatalogListingPreviewDependencies;
  }>,
): Promise<CatalogListingPreview> {
  const { listing, maxPreviewRows } = options;
  const dependencies = options.dependencies ?? DEFAULT_DEPENDENCIES;

  if (listing.accessKind === "api_resource") {
    if (_isReadFromCsvSample(listing.apiResourceFormat)) {
      const csvText = await dependencies.fetchCsvSample(listing.id);
      return _toPreview(
        await _sniffCsvFile(dependencies, csvText, maxPreviewRows),
      );
    }
    if (listing.parquetCacheFolderPath === undefined) {
      throw new Error(
        `Catalog listing '${listing.id}' has no Parquet copy to preview yet`,
      );
    }
    return _toPreview(
      await dependencies.previewParquetBlob({
        parquetBlob: await dependencies.fetchCopyPart(
          `${listing.parquetCacheFolderPath}/${buildParquetCachePartName(0)}`,
        ),
        maxPreviewRows,
      }),
    );
  }

  const parquetUrl = listing.canonicalUrls?.find((url) => {
    return url.toLowerCase().endsWith(".parquet");
  });
  if (parquetUrl === undefined) {
    throw new Error(
      `No Parquet URL in catalog listing '${listing.id}' to preview`,
    );
  }
  return _toPreview(
    await dependencies.previewParquetBlob({
      parquetBlob: await dependencies.fetchParquetUrl(parquetUrl),
      maxPreviewRows,
    }),
  );
}
