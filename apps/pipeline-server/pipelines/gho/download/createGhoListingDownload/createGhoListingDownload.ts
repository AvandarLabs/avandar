import { GhoDimensionIds } from "@pipelines/gho/GhoDimensionIds";
import { GHO_FACT_COLUMNS } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";
import { GHO_DIMENSION_VALUE_COLUMNS } from "@pipelines/gho/makeGhoDimensionRelation/makeGhoDimensionRelation";
import type {
  ListingDownloadColumn,
  ListingDownloadScript,
  RelationColumn,
} from "@avandar/etl";

function _toDownloadColumns(
  columns: readonly RelationColumn[],
): ListingDownloadColumn[] {
  return columns.map((column) => {
    return { name: column.name, dataType: column.castDataType };
  });
}

/**
 * Creates the GHO pipeline's download script. GHO answers a whole indicator,
 * or a whole dimension's value list, in one OData JSON response whose
 * `value` holds the rows, so a GHO listing is downloaded whole and read with
 * the columns the pipeline declared for it. The listing's freshness probe,
 * not the script, gives the copy's source version.
 *
 * @returns The download script.
 */
export function createGhoListingDownload(): ListingDownloadScript {
  return async ({ listing }) => {
    const columns = GhoDimensionIds.isApiResourceId(listing.apiResourceId)
      ? GHO_DIMENSION_VALUE_COLUMNS
      : GHO_FACT_COLUMNS;
    return {
      paging: false,
      url: `${listing.apiBaseUrl}/${listing.apiResourceId}`,
      contentKind: "json",
      recordsField: "value",
      columns: _toDownloadColumns(columns),
      sourceVersion: undefined,
    };
  };
}
