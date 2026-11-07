import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Database } from "$/types/database.types";

type GeneratedSearchDBRow =
  Database["public"]["Functions"]["rpc_data_catalog_listings__search"]["Returns"][number];

type _NullableSearchColumn =
  | "organization2_name"
  | "organization3_name"
  | "organization4_name";

/**
 * One row `rpc_data_catalog_listings__search` returns. The generated
 * types mark every `returns table` column non-null, but a listing's
 * deeper organization levels are null when its source has none.
 */
export type DataCatalogSearchDBRow = Omit<
  GeneratedSearchDBRow,
  _NullableSearchColumn
> &
  Readonly<Record<_NullableSearchColumn, string | null>>;

/** One page of catalog search results. */
export type DataCatalogSearchPage = {
  /** The listings on this page, in the order search ranked them. */
  rows: DataCatalogListing.SearchResult[];

  /** How many listings match the search across every page. */
  totalCount: number;

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
  const loadedCount = (pageNum + 1) * pageSize;
  return {
    rows: dbRows.map((dbRow) => {
      return {
        id: dbRow.id as DataCatalogListing.Id,
        displayName: dbRow.display_name,
        organization1Name: dbRow.organization1_name,
        organization2Name: dbRow.organization2_name ?? undefined,
        organization3Name: dbRow.organization3_name ?? undefined,
        organization4Name: dbRow.organization4_name ?? undefined,
        isWorkspaceLoadable: dbRow.is_workspace_loadable,
        isInvalid: dbRow.is_invalid,
      };
    }),
    totalCount,
    nextPage: loadedCount < totalCount ? pageNum + 1 : undefined,
  };
}
