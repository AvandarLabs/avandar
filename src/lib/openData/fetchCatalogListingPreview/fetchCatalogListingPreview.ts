import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { fetchOpenDataCatalogResource } from "@/lib/openData/fetchOpenDataCatalogResource";
import { fetchOpenDataColumnTypeSample } from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type {
  DuckDbColumnSchema,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { FetchedOpenDataCatalogResource } from "@/lib/openData/fetchOpenDataCatalogResource";

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
  fetchApiResource: (
    catalogListingId: DataCatalogListing.Id,
  ) => Promise<Pick<FetchedOpenDataCatalogResource, "bytes" | "contentKind">>;
  /** Reads the start of an API-backed CSV listing's data, as CSV text. */
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
  fetchApiResource: fetchOpenDataCatalogResource,
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
 * Reads the first `maxPreviewRows` rows of a catalog listing's data, without
 * adding the listing to a workspace.
 *
 * An API-backed CSV listing is read from the start of its file, the same
 * sample its column types are verified from, so a source of any size can be
 * previewed. Any other API-backed listing is read whole through the
 * open-data edge function, the proxy that loads it into a workspace, which
 * refuses one too large to relay. A pipeline listing is read from the
 * Parquet URL its catalog row names. Either way DuckDB reads only the
 * preview's rows and nothing is kept once they are read.
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
      "id" | "accessKind" | "apiResourceFormat" | "canonicalUrls"
    >;
    maxPreviewRows: number;
    dependencies?: CatalogListingPreviewDependencies;
  }>,
): Promise<CatalogListingPreview> {
  const { listing, maxPreviewRows } = options;
  const dependencies = options.dependencies ?? DEFAULT_DEPENDENCIES;

  if (listing.accessKind === "api_resource") {
    if (listing.apiResourceFormat?.toUpperCase() === "CSV") {
      const csvText = await dependencies.fetchCsvSample(listing.id);
      return _toPreview(
        await _sniffCsvFile(dependencies, csvText, maxPreviewRows),
      );
    }
    const resource = await dependencies.fetchApiResource(listing.id);
    if (resource.contentKind === "csv") {
      return _toPreview(
        await _sniffCsvFile(dependencies, resource.bytes, maxPreviewRows),
      );
    }
    return _toPreview(
      await dependencies.previewParquetBlob({
        parquetBlob: new Blob([resource.bytes]),
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
