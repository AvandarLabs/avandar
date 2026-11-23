import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Database } from "$/types/database.types";

type GeneratedSearchDBRow =
  Database["public"]["Functions"]["rpc_data_catalog_listings__search"]["Returns"][number];

/**
 * One row `rpc_data_catalog_listings__search` returns. The generated types
 * mark every `returns table` column non-null, but `organization2_name`
 * through `organization4_name` are null on a listing without that level,
 * `pipeline_name` on a listing no pipeline wrote, `file_format` on one with
 * no format (a map or a link), and `last_updated_at` on one with no update or
 * sync date.
 */
export type DataCatalogSearchDBRow = Omit<
  GeneratedSearchDBRow,
  | "organization2_name"
  | "organization3_name"
  | "organization4_name"
  | "pipeline_name"
  | "file_format"
  | "last_updated_at"
> & {
  organization2_name: string | null;
  organization3_name: string | null;
  organization4_name: string | null;
  pipeline_name: string | null;
  file_format: string | null;
  last_updated_at: string | null;
};

/** One page of catalog search results. */
export type DataCatalogSearchPage = {
  /** The listings on this page, in the order search ranked them. */
  rows: DataCatalogListing.SearchResult[];

  /**
   * How many listings match the search across every page, or, when
   * `isTotalCapped`, the most that were counted.
   */
  totalCount: number;

  /** Whether more listings match than were counted. */
  isTotalCapped: boolean;

  /** The page to request next, or undefined once the last match is loaded. */
  nextPage: number | undefined;
};

/**
 * Builds a page of catalog search results from the rows the search RPC
 * returned for page `pageNum`.
 */
export function createDataCatalogSearchPage({
  dbRows,
  pageNum,
  pageSize,
}: {
  dbRows: readonly DataCatalogSearchDBRow[];
  pageNum: number;
  pageSize: number;
}): DataCatalogSearchPage {
  // Every row repeats the total, so an empty page means nothing matched.
  const totalCount = dbRows[0]?.total_count ?? 0;
  const isTotalCapped = dbRows[0]?.is_total_capped ?? false;
  const loadedCount = (pageNum + 1) * pageSize;
  // A capped total says nothing about where the matches end, so paging goes
  // on until a page comes back short.
  const hasNextPage = isTotalCapped
    ? dbRows.length === pageSize
    : loadedCount < totalCount;
  return {
    rows: dbRows.map((dbRow) => {
      return {
        id: dbRow.id as DataCatalogListing.Id,
        displayName: dbRow.display_name,
        organization1Name: dbRow.organization1_name,
        organization2Name: dbRow.organization2_name ?? undefined,
        organization3Name: dbRow.organization3_name ?? undefined,
        organization4Name: dbRow.organization4_name ?? undefined,
        pipelineName: dbRow.pipeline_name ?? undefined,
        isWorkspaceLoadable: dbRow.is_workspace_loadable,
        isInvalid: dbRow.is_invalid,
        fileFormat: dbRow.file_format ?? undefined,
        lastUpdatedAt: dbRow.last_updated_at ?? undefined,
      };
    }),
    totalCount,
    isTotalCapped,
    nextPage: hasNextPage ? pageNum + 1 : undefined,
  };
}
