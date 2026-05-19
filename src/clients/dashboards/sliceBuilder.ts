/**
 * Helpers that turn a `PublishSliceConfig` into a materialization SQL string,
 * and that derive a sensible "narrowest" default from a dashboard's DataViz +
 * Filter blocks.
 */
import { isPlainObject, isString, traverse } from "@utils";
import { Parser } from "node-sql-parser";
import type {
  DashboardPublishConfig,
  PublishSliceConfig,
  PublishSliceRowFilter,
} from "$/models/Dashboard/PublishSliceConfig";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const UUID_REGEX = new RegExp(
  [
    "\\b",
    "[0-9a-f]{8}-",
    "[0-9a-f]{4}-",
    "[1-5][0-9a-f]{3}-",
    "[89ab][0-9a-f]{3}-",
    "[0-9a-f]{12}",
    "\\b",
  ].join(""),
  "gi",
);

function _quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function _formatLiteral(value: string | number): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Walk a Puck dashboard config and return all (datasetId, columnName) pairs
 * referenced across DataViz SQL queries and FilterPBlock column targets.
 *
 * Column resolution uses `node-sql-parser`'s `columnList` to extract column
 * references from each DataViz SQL string. `columnList` returns entries shaped
 * like `select::<table>::<column>` or `select::null::<column>` when the table
 * is unqualified.
 *
 * The mapping is best-effort: when a SQL string fails to parse, we fall back
 * to "all columns of that dataset are referenced" (i.e. an empty set in the
 * map plus a sentinel for the dataset, signaling "narrowest" = full).
 */
export type DashboardReferencedColumns = {
  /** datasetId -> set of column names referenced by viz/filter blocks */
  perDataset: Record<DatasetId, Set<string>>;
  /** datasets where SQL parsing failed; treat as "all columns required" */
  unparseable: Set<DatasetId>;
};

type DataVizLike = {
  type: string;
  props: {
    nlQuery?: { rawSql?: unknown; prompt?: unknown };
    columnName?: unknown;
  };
};

function _extractDataVizSqls(dashConfig: unknown): string[] {
  const out: string[] = [];
  traverse(dashConfig, (node) => {
    if (!isPlainObject(node)) return;
    const cast = node as unknown as DataVizLike;
    if (cast.type !== "DataViz" || !isPlainObject(cast.props)) return;
    const sql: unknown = cast.props.nlQuery?.rawSql;
    if (isString(sql) && sql.trim().length > 0) {
      out.push(sql.trim());
    }
  });
  return out;
}

function _extractFilterColumns(dashConfig: unknown): string[] {
  const out: string[] = [];
  traverse(dashConfig, (node) => {
    if (!isPlainObject(node)) return;
    const cast = node as unknown as DataVizLike;
    if (cast.type !== "Filter" || !isPlainObject(cast.props)) return;
    if (isString(cast.props.columnName) && cast.props.columnName.length > 0) {
      out.push(cast.props.columnName);
    }
  });
  return out;
}

function _extractDatasetIdsFromSql(sql: string): DatasetId[] {
  const matches = Array.from(sql.matchAll(UUID_REGEX)).map((m) => {
    return String(m[0]).toLowerCase() as DatasetId;
  });
  return Array.from(new Set(matches));
}

export function extractReferencedColumns(
  dashConfig: unknown,
  allDatasetIds: readonly DatasetId[],
): DashboardReferencedColumns {
  const perDataset: Record<DatasetId, Set<string>> = {};
  const unparseable = new Set<DatasetId>();
  for (const id of allDatasetIds) {
    perDataset[id] = new Set();
  }

  const parser = new Parser();
  const sqls = _extractDataVizSqls(dashConfig);
  for (const sql of sqls) {
    const datasetIds = _extractDatasetIdsFromSql(sql).filter((id) => {
      return allDatasetIds.includes(id);
    });
    if (datasetIds.length === 0) continue;

    let cols: readonly string[];
    try {
      // PostgreSQL flavour is the closest match to DuckDB syntax that
      // node-sql-parser supports.
      const raw = parser.columnList(sql, { database: "PostgresQL" });
      cols = raw.map((entry) => {
        // Entries look like "type::<table>::<column>". Take the last segment.
        const parts = entry.split("::");
        return parts[parts.length - 1] ?? "";
      });
      // A star reference signals "all columns required".
      if (cols.some((c) => {return c === "(.*)" || c === "*"})) {
        for (const id of datasetIds) unparseable.add(id);
        continue;
      }
    } catch {
      for (const id of datasetIds) unparseable.add(id);
      continue;
    }

    for (const id of datasetIds) {
      const set = perDataset[id] ?? new Set<string>();
      for (const c of cols) {
        if (c.length > 0) set.add(c);
      }
      perDataset[id] = set;
    }
  }

  // FilterPBlock columns aren't tied to a specific dataset id, so we apply
  // them to every dataset that has at least one viz query. (For multi-dataset
  // dashboards this is conservative but safe.)
  const filterCols = _extractFilterColumns(dashConfig);
  for (const id of allDatasetIds) {
    const set = perDataset[id] ?? new Set<string>();
    for (const c of filterCols) set.add(c);
    perDataset[id] = set;
  }

  return { perDataset, unparseable };
}

/**
 * Compose a materialization SQL for one dataset, given the slice config and
 * a SQL expression that yields the underlying dataset rows.
 *
 * `baseSelectExpr` is the inner SQL block — typically `"<datasetId>"` for a
 * regular dataset (DuckDB treats the dataset id as a registered view name) or
 * the inner SQL of a virtual dataset.
 *
 * `availableColumns` is used to (a) filter the custom-mode column allow-list
 * to columns that actually exist on the dataset, and (b) treat the slice's
 * row filters as no-ops when they reference unknown columns.
 */
export function buildSliceSql(options: {
  baseSelectExpr: string;
  sliceConfig: PublishSliceConfig;
  availableColumns: readonly string[];
  queriedColumns: readonly string[];
  treatAsAllColumns: boolean;
}): string {
  const {
    baseSelectExpr,
    sliceConfig,
    availableColumns,
    queriedColumns,
    treatAsAllColumns,
  } = options;

  // Resolve column projection.
  let projection: string;
  if (sliceConfig.mode === "all_columns" || treatAsAllColumns) {
    projection = "*";
  } else if (sliceConfig.mode === "queried") {
    const cols = queriedColumns.filter((c) => {
      return availableColumns.includes(c);
    });
    projection =
      cols.length > 0 ? cols.map(_quoteIdent).join(", ") : "*";
  } else {
    const cols = sliceConfig.columns.filter((c) => {
      return availableColumns.includes(c);
    });
    projection =
      cols.length > 0 ? cols.map(_quoteIdent).join(", ") : "*";
  }

  // Resolve row filters.
  const wheres: string[] = [];
  if (sliceConfig.mode === "custom") {
    for (const rf of sliceConfig.rowFilters) {
      const clause = _rowFilterToSql(rf, availableColumns);
      if (clause) wheres.push(clause);
    }
  }

  const innerSql = baseSelectExpr.trim().replace(/;\s*$/u, "");
  const wherePart =
    wheres.length > 0 ? ` WHERE ${wheres.join(" AND ")}` : "";

  return `SELECT ${projection} FROM (${innerSql}) AS _ava_slice${wherePart}`;
}

function _rowFilterToSql(
  filter: PublishSliceRowFilter,
  availableColumns: readonly string[],
): string | undefined {
  if (!availableColumns.includes(filter.columnName)) return undefined;
  const col = _quoteIdent(filter.columnName);

  if (filter.kind === "enum") {
    const vals = filter.values.filter((v) => {return v.length > 0});
    if (vals.length === 0) return undefined;
    return `${col} IN (${vals.map((v) => {return _formatLiteral(v)}).join(", ")})`;
  }
  if (filter.kind === "range_number") {
    const parts: string[] = [];
    if (typeof filter.min === "number" && Number.isFinite(filter.min)) {
      parts.push(`${col} >= ${filter.min}`);
    }
    if (typeof filter.max === "number" && Number.isFinite(filter.max)) {
      parts.push(`${col} <= ${filter.max}`);
    }
    if (parts.length === 0) return undefined;
    return parts.join(" AND ");
  }
  // range_date
  const parts: string[] = [];
  if (filter.start) parts.push(`${col} >= ${_formatLiteral(filter.start)}`);
  if (filter.end) parts.push(`${col} <= ${_formatLiteral(filter.end)}`);
  if (parts.length === 0) return undefined;
  return parts.join(" AND ");
}

/**
 * Read a dashboard's persisted publish config from its `config` JSON blob.
 * Lives under the `__publishConfig` sibling key alongside Puck's
 * `{root, content, zones}`. Missing or malformed values yield an empty
 * config; the upstream slice picker defaults to "queried" per dataset.
 */
export function readDashboardPublishConfig(
  dashConfig: unknown,
): DashboardPublishConfig {
  if (!isPlainObject(dashConfig)) return { slices: {} };
  const raw = (dashConfig as Record<string, unknown>)["__publishConfig"];
  if (!isPlainObject(raw)) return { slices: {} };
  const slices = (raw as { slices?: unknown }).slices;
  if (!isPlainObject(slices)) return { slices: {} };
  return { slices: slices as DashboardPublishConfig["slices"] };
}

export function writeDashboardPublishConfig(
  dashConfig: unknown,
  publishConfig: DashboardPublishConfig,
): Record<string, unknown> {
  const base = isPlainObject(dashConfig) ? { ...dashConfig } : {};
  return {
    ...(base as Record<string, unknown>),
    __publishConfig: publishConfig,
  };
}
