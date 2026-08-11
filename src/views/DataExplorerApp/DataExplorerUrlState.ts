import {
  isNonNullish,
  makeObjectFromEntries,
  prop,
  propEq,
} from "@avandar/utils";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import { z } from "zod";
import type {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
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
 *   &sql=<rawSql>
 *   &vc=<JSON-stringified VizConfig> (omitted when viz is the default table)
 *
 * When `sql` is present it is the authoritative query: `ds`, `cols`, `agg`,
 * and `orderBy`/`orderDir` are not written (and are ignored on hydrate) so a
 * leftover Manual Query cannot conflict with AI / edited SQL.
 *
 * `sql` is omitted while the current query has a runtime error so refresh
 * does not re-apply broken SQL from the URL.
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

export type DataExplorerUrlSearch = z.infer<typeof DataExplorerSearchSchema>;

export type ParsedUrlState = {
  dsId?: string;
  colNames?: readonly string[];
  aggregations?: Readonly<Record<string, QueryAggregationType.T>>;
  orderByColName?: string;
  orderDir?: OrderByDirection;
  rawSql?: string;
  vizConfig?: VizConfig;
  openDataset?: OpenDatasetInfo;
};

/**
 * Parses the raw URL search params into typed, structured state that the
 * Data Explorer can use to restore its session.
 */
export function parseUrlSearch(search: DataExplorerUrlSearch): ParsedUrlState {
  const result: ParsedUrlState = {};

  if (search.ds) {
    result.dsId = search.ds;
  }

  if (search.cols) {
    result.colNames = search.cols.split(",").filter(Boolean);
  }

  if (search.agg) {
    const aggEntries = search.agg
      .split(",")
      .map((pair): readonly [string, QueryAggregationType.T] | undefined => {
        const idx = pair.indexOf(":");
        if (idx === -1) {
          return undefined;
        }
        const name = pair.slice(0, idx);
        const type = pair.slice(idx + 1);
        if (name && QueryAggregationType.isValid(type)) {
          return [name, type] as const;
        }
        return undefined;
      })
      .filter(isNonNullish);
    if (aggEntries.length > 0) {
      result.aggregations = makeObjectFromEntries(aggEntries);
    }
  }

  if (search.orderBy) {
    result.orderByColName = search.orderBy;
  }

  if (search.orderDir) {
    result.orderDir = search.orderDir;
  }

  if (search.sql) {
    result.rawSql = search.sql;
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
        st?: string;
        vid?: string;
      };
      if (raw.did && raw.name) {
        // Older URLs were emitted before non-virtual datasets could be
        // opened; fall back to "virtual" so legacy links keep loading.
        const sourceType = (raw.st ?? "virtual") as DatasetSource.SourceType;
        result.openDataset = {
          datasetId: raw.did as OpenDatasetInfo["datasetId"],
          name: raw.name,
          sourceType,
          virtualDatasetId:
            raw.vid ?
              (raw.vid as NonNullable<OpenDatasetInfo["virtualDatasetId"]>)
            : undefined,
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
export function serializeStateToUrl(
  state: DataExplorerAppState,
): DataExplorerUrlSearch {
  const { query, rawSql, vizConfig } = state;
  const params: DataExplorerUrlSearch = {};

  // Raw SQL drives execution in `useDataQuery`; structured fields are ignored
  // when `rawSql` is set. Omit them from the URL so refresh never pairs a
  // stale `ds` from Manual Query with SQL that references other table names.
  if (!rawSql) {
    if (query.dataSource) {
      params.ds = query.dataSource.id;
    }

    if (query.queryColumns.length > 0) {
      params.cols = query.queryColumns.map(prop("baseColumn.name")).join(",");

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
      const orderCol = query.queryColumns.find(
        propEq("id", query.orderByColumn),
      );
      if (orderCol) {
        params.orderBy = orderCol.baseColumn.name;
        if (query.orderByDirection) {
          params.orderDir = query.orderByDirection;
        }
      }
    }
  }

  if (rawSql && !state.lastQueryError) {
    params.sql = rawSql;
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
    const { datasetId, name, sourceType, virtualDatasetId } = state.openDataset;
    params.od = JSON.stringify({
      did: datasetId,
      name,
      st: sourceType,
      ...(virtualDatasetId ? { vid: virtualDatasetId } : {}),
    });
  }

  return params;
}

/**
 * Clears every known explorer search key so TanStack Router drops stale
 * params.
 */
export const EMPTY_EXPLORER_URL_SEARCH: DataExplorerUrlSearch = {
  ds: undefined,
  cols: undefined,
  agg: undefined,
  orderBy: undefined,
  orderDir: undefined,
  sql: undefined,
  vc: undefined,
  od: undefined,
};

/**
 * Normalises raw router search into the same compact shape as
 * `serializeStateToUrl`, so we can compare URL vs in-memory state without
 * fighting merge semantics (`navigate({ search: {} })` leaves stale keys).
 */
export function normalizeExplorerUrlSearch(
  search: DataExplorerUrlSearch,
): DataExplorerUrlSearch {
  const parsed = parseUrlSearch(search);
  const params: DataExplorerUrlSearch = {};

  if (!parsed.rawSql) {
    if (parsed.dsId) {
      params.ds = parsed.dsId;
    }

    if (parsed.colNames && parsed.colNames.length > 0) {
      params.cols = parsed.colNames.join(",");
    }

    if (parsed.aggregations) {
      params.agg = Object.entries(parsed.aggregations)
        .map(([name, agg]) => {
          return `${name}:${agg}`;
        })
        .join(",");
    }

    if (parsed.orderByColName) {
      params.orderBy = parsed.orderByColName;
      if (parsed.orderDir) {
        params.orderDir = parsed.orderDir;
      }
    }
  }

  if (parsed.rawSql) {
    params.sql = parsed.rawSql;
  }

  if (parsed.vizConfig && parsed.vizConfig.vizType !== "table") {
    try {
      params.vc = JSON.stringify(parsed.vizConfig);
    } catch {
      // Ignore malformed viz JSON in the URL.
    }
  }

  if (parsed.openDataset) {
    const { datasetId, name, sourceType, virtualDatasetId } =
      parsed.openDataset;
    params.od = JSON.stringify({
      did: datasetId,
      name,
      st: sourceType,
      ...(virtualDatasetId ? { vid: virtualDatasetId } : {}),
    });
  }

  return params;
}

export function areExplorerUrlSearchParamsEqual(
  left: DataExplorerUrlSearch,
  right: DataExplorerUrlSearch,
): boolean {
  return (
    JSON.stringify(normalizeExplorerUrlSearch(left)) ===
    JSON.stringify(normalizeExplorerUrlSearch(right))
  );
}

/**
 * Returns `true` when the Data Explorer state has not yet been modified from
 * its initial blank state (no data source, no columns, no raw SQL).
 */
export function isDefaultExplorerState(state: DataExplorerAppState): boolean {
  return (
    state.query.dataSource === undefined &&
    state.query.queryColumns.length === 0 &&
    state.rawSql === undefined
  );
}
