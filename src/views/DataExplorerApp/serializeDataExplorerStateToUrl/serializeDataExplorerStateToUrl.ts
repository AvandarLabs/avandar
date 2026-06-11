import { prop, propEq } from "@utils";
import { DataExplorerUrlSearch } from "../buildDataExplorerStateFromUrl/buildDataExplorerStateFromUrl";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

/**
 * Serialises the current Data Explorer state into the compact URL search
 * param format. Only non-default values are included.
 */
export function serializeDataExplorerStateToUrl(
  appState: DataExplorerAppState,
): DataExplorerUrlSearch {
  const { query, rawSQL, vizConfig, openDataset } = appState;

  const queryParams = (() => {
    // Raw SQL drives execution in `useDataQuery`; structured fields are ignored
    // when `rawSQL` is set. Omit them from the URL so refresh never pairs a
    // stale `ds` from Manual Query with SQL that references other table names.
    if (rawSQL) {
      return { sql: rawSQL };
    }

    const structuredParams: DataExplorerUrlSearch = {
      ds: query.dataSource?.id,
    };

    // construct aggregations string
    if (query.queryColumns.length > 0) {
      structuredParams.cols = query.queryColumns
        .map(prop("baseColumn.name"))
        .join(",");

      const nonDefaultAggs = query.queryColumns.filter((col) => {
        const agg = query.aggregations[col.id];
        return agg !== undefined && agg !== "none";
      });

      if (nonDefaultAggs.length > 0) {
        structuredParams.agg = nonDefaultAggs
          .map((col) => {
            return `${col.baseColumn.name}:${query.aggregations[col.id]}`;
          })
          .join(",");
      }
    }

    if (query.orderByColumn) {
      const orderCol = query.queryColumns.find(
        propEq("id", query.orderByColumn),
      );
      if (orderCol) {
        structuredParams.orderBy = orderCol.baseColumn.name;
        if (query.orderByDirection) {
          structuredParams.orderDir = query.orderByDirection;
        }
      }
    }

    return structuredParams;
  })();

  const openDatasetParams =
    openDataset ?
      {
        did: openDataset?.datasetId,
        name: openDataset?.name,
        vid: openDataset?.virtualDatasetId,
      }
    : undefined;

  // Omit `vc` when the viz is the same as the initial Data Explorer default
  // (`table` only). Otherwise Reset + URL sync would immediately put
  // `?vc={"vizType":"table"}` back after `navigate({ search: {} })`, and the
  // query string could never clear in one action.
  const vizConfigParams = vizConfig.vizType !== "table" ? vizConfig : undefined;

  const params: DataExplorerUrlSearch = {
    ...queryParams,
    od: openDatasetParams ? JSON.stringify(openDatasetParams) : undefined,
    vc: vizConfigParams ? JSON.stringify(vizConfigParams) : undefined,
  };

  return params;
}
