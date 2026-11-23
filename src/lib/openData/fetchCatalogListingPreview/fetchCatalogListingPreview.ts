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
   * The columns DuckDB read as dates or times, in source order. Their values
   * arrive as epoch milliseconds, so the grid has to be told to format them.
   * A list, because this preview is stored in the JSON query cache: a Set
   * comes back as an object, and the grid crashes calling `.has` on it.
   */
  dateColumnNames: readonly string[];
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
    dateColumnNames: sniffed.columns
      .filter((column) => {
        return DuckDbDataTypeUtils.isDateOrTimestamp(column.column_type);
      })
      .map((column) => {
        return column.column_name;
      }),
    rows: sniffed.previewRows,
  };
}

/**
 * The resource formats the column-type sample route can preview: it returns
 * their first rows as CSV text.
 */
const CSV_SAMPLE_FORMATS: ReadonlySet<string> = new Set(["CSV", "ODATA"]);

/**
 * Where an API-backed listing's preview rows come from.
 *
 * `stored-copy` is the Parquet copy in Storage. `live-sample` is the
 * column-type sample route, which reads the source API. A column recheck
 * asks for `live-sample` even when a copy is already stored.
 */
export type CatalogListingPreviewSource = "stored-copy" | "live-sample";

/**
 * Whether a catalog preview can read this format from the column-type
 * sample route. CSV and OData can. A stored Parquet copy is still used
 * when one exists, unless the caller asks for a live sample.
 */
export function isCatalogListingSampleFormat(
  apiResourceFormat: string | undefined,
): boolean {
  return (
    apiResourceFormat !== undefined &&
    CSV_SAMPLE_FORMATS.has(apiResourceFormat.toUpperCase())
  );
}

type ApiResourcePreviewListing = Pick<
  DataCatalogListing.T,
  "id" | "apiResourceFormat" | "parquetCacheFolderPath"
>;

/** Reads an API-backed listing's preview from its copy or from the API. */
async function _readApiResourcePreview(options: {
  listing: ApiResourcePreviewListing;
  maxPreviewRows: number;
  source: CatalogListingPreviewSource | undefined;
  dependencies: CatalogListingPreviewDependencies;
}): Promise<CatalogListingPreview> {
  const { listing, maxPreviewRows, dependencies } = options;
  const readLiveSample =
    options.source === "live-sample" ||
    listing.parquetCacheFolderPath === undefined;
  if (
    readLiveSample &&
    isCatalogListingSampleFormat(listing.apiResourceFormat)
  ) {
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
  const partPath = `${listing.parquetCacheFolderPath}/${buildParquetCachePartName(0)}`;
  return _toPreview(
    await dependencies.previewParquetBlob({
      parquetBlob: await dependencies.fetchCopyPart(partPath),
      maxPreviewRows,
    }),
  );
}

/**
 * Reads the first `maxPreviewRows` rows of a catalog listing's data, without
 * adding the listing to a workspace.
 *
 * An API-backed listing that already has a Parquet copy is read from the
 * first part of that copy, so opening it does not call the source API. A
 * CSV or OData listing with no copy yet is read from the column-type sample
 * route. Any other API-backed listing has no preview until a workspace adds
 * it and the copy is built: browsing never starts a build. A pipeline
 * listing is read from the Parquet URL its catalog row names. DuckDB reads
 * only the preview's rows and nothing is kept once they are read.
 *
 * @param options.listing The listing to preview.
 * @param options.maxPreviewRows How many rows to read at most.
 * @param options.source `live-sample` reads the source API even when a
 * copy is stored. Omitted, a stored copy is preferred.
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
    source?: CatalogListingPreviewSource;
    dependencies?: CatalogListingPreviewDependencies;
  }>,
): Promise<CatalogListingPreview> {
  const { listing, maxPreviewRows } = options;
  const dependencies = options.dependencies ?? DEFAULT_DEPENDENCIES;

  if (listing.accessKind === "api_resource") {
    return await _readApiResourcePreview({
      listing,
      maxPreviewRows,
      source: options.source,
      dependencies,
    });
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
