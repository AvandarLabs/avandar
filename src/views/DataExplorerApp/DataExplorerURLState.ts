import { z } from "zod";
import type {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { OrderByDirection } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * Zod schema for the Data Explorer URL search params.
 *
 * We persist a minimal set of identifiers rather than serialising full
 * model objects, keeping URLs short and human-readable:
 *
 *   ?ds=<dataSourceId>
 *   &cols=<colName1>,<colName2>
 *   &agg=<colName>:<aggregationType>,...
 *   &orderBy=<colName>&orderDir=asc|desc
 *   &sql=<rawSQL>
 *   &vc=<JSON-stringified VizConfig> (omitted when viz is the default table)
 *
 * When `sql` is present it is the authoritative query: `ds`, `cols`, `agg`,
 * and `orderBy`/`orderDir` are not written (and are ignored on hydrate) so a
 * leftover Manual Query cannot conflict with AI / edited SQL.
 */
export const DataExplorerSearchSchema = z.object({
  ds: z.string().optional(),
  cols: z.string().optional(),
  agg: z.string().optional(),
  orderBy: z.string().optional(),
  orderDir: z.enum(["asc", "desc"] as const).optional(),
  sql: z.string().optional(),
  vc: z.string().optional(),

  /** Compact JSON of `{ did, name, vid }` identifying the open dataset. */
  od: z.string().optional(),
});

export type DataExplorerURLSearch = z.infer<typeof DataExplorerSearchSchema>;

export type ParsedURLState = {
  dsId?: string;
  colNames?: readonly string[];
  aggregations?: Readonly<Record<string, QueryAggregationType.T>>;
  orderByColName?: string;
  orderDir?: OrderByDirection;
  rawSQL?: string;
  vizConfig?: VizConfig;
  openDataset?: OpenDatasetInfo;
};

const VALID_AGGREGATION_VALUES = new Set([
  "sum",
  "avg",
  "count",
  "max",
  "min",
  "group_by",
  "none",
]);

function _isValidAgg(value: string): value is QueryAggregationType.T {
  return VALID_AGGREGATION_VALUES.has(value);
}

/**
 * Parses the raw URL search params into typed, structured state that the
 * Data Explorer can use to restore its session.
 */
export function parseURLSearch(search: DataExplorerURLSearch): ParsedURLState {
  const result: ParsedURLState = {};

  if (search.ds) {
    result.dsId = search.ds;
  }

  if (search.cols) {
    result.colNames = search.cols.split(",").filter(Boolean);
  }

  if (search.agg) {
    const agg: Record<string, QueryAggregationType.T> = {};
    search.agg.split(",").forEach((pair) => {
      const idx = pair.indexOf(":");
      if (idx === -1) {
        return;
      }
      const name = pair.slice(0, idx);
      const type = pair.slice(idx + 1);
      if (name && _isValidAgg(type)) {
        agg[name] = type;
      }
    });
    if (Object.keys(agg).length > 0) {
      result.aggregations = agg;
    }
  }

  if (search.orderBy) {
    result.orderByColName = search.orderBy;
  }

  if (search.orderDir) {
    result.orderDir = search.orderDir;
  }

  if (search.sql) {
    result.rawSQL = search.sql;
  }

  if (search.vc) {
    try {
      result.vizConfig = JSON.parse(search.vc) as VizConfig;
    } catch {
      // Ignore malformed JSON — the viz will fall back to defaults.
    }
  }

  if (search.od) {
    try {
      const raw = JSON.parse(search.od) as {
        did: string;
        name: string;
        vid: string;
      };
      if (raw.did && raw.name && raw.vid) {
        result.openDataset = {
          datasetId: raw.did as OpenDatasetInfo["datasetId"],
          name: raw.name,
          virtualDatasetId: raw.vid as OpenDatasetInfo["virtualDatasetId"],
        };
      }
    } catch {
      // Ignore malformed JSON.
    }
  }

  return result;
}

/**
 * Serialises the current Data Explorer state into the compact URL search
 * param format. Only non-default values are included.
 */
export function serializeStateToURL(
  state: DataExplorerAppState,
): DataExplorerURLSearch {
  const { query, rawSQL, vizConfig } = state;
  const params: DataExplorerURLSearch = {};

  // Raw SQL drives execution in `useDataQuery`; structured fields are ignored
  // when `rawSQL` is set. Omit them from the URL so refresh never pairs a
  // stale `ds` from Manual Query with SQL that references other table names.
  if (!rawSQL) {
    if (query.dataSource) {
      params.ds = query.dataSource.id;
    }

    if (query.queryColumns.length > 0) {
      params.cols = query.queryColumns
        .map((col) => {
          return col.baseColumn.name;
        })
        .join(",");

      const nonDefaultAggs = query.queryColumns.filter((col) => {
        const agg = query.aggregations[col.id];
        return agg !== undefined && agg !== "none";
      });

      if (nonDefaultAggs.length > 0) {
        params.agg = nonDefaultAggs
          .map((col) => {
            return `${col.baseColumn.name}:${query.aggregations[col.id]}`;
          })
          .join(",");
      }
    }

    if (query.orderByColumn) {
      const orderCol = query.queryColumns.find((col) => {
        return col.id === query.orderByColumn;
      });
      if (orderCol) {
        params.orderBy = orderCol.baseColumn.name;
        if (query.orderByDirection) {
          params.orderDir = query.orderByDirection;
        }
      }
    }
  }

  if (rawSQL) {
    params.sql = rawSQL;
  }

  // Omit `vc` when the viz is the same as the initial Data Explorer default
  // (`table` only). Otherwise Reset + URL sync would immediately put
  // `?vc={"vizType":"table"}` back after `navigate({ search: {} })`, and the
  // query string could never clear in one action.
  try {
    if (vizConfig.vizType !== "table") {
      params.vc = JSON.stringify(vizConfig);
    }
  } catch {
    // Ignore — viz config will fall back to defaults on next load.
  }

  if (state.openDataset) {
    const { datasetId, name, virtualDatasetId } = state.openDataset;
    params.od = JSON.stringify({
      did: datasetId,
      name,
      vid: virtualDatasetId,
    });
  }

  return params;
}

/**
 * Returns `true` when the Data Explorer state has not yet been modified from
 * its initial blank state (no data source, no columns, no raw SQL).
 */
export function isDefaultExplorerState(state: DataExplorerAppState): boolean {
  return (
    state.query.dataSource === undefined &&
    state.query.queryColumns.length === 0 &&
    state.rawSQL === undefined
  );
}
