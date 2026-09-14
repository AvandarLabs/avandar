import { isDefined, isPlainObject, isString, traverse } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { Parser } from "node-sql-parser";
import { match } from "ts-pattern";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

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

function _formatLiteral(value: string | number): string {
  return typeof value === "number"
    ? Number.isFinite(value)
      ? String(value)
      : "NULL"
    : `'${value.replace(/'/g, "''")}'`;
}

/** Columns that publication must retain for each dashboard dataset. */
export type DashboardReferencedColumns = {
  /** Column names referenced by each dashboard dataset. */
  perDataset: Record<Dataset.Id, Set<string>>;
  /** Datasets whose SQL could not be narrowed safely. */
  unparseable: Set<Dataset.Id>;
};

type DataVizLike = {
  type: string;
  props: {
    nlQuery?: { rawSql?: unknown; prompt?: unknown };
    columnName?: unknown;
  };
};

type BuildSliceSqlOptions = {
  baseSelectExpr: string;
  sliceConfig: PublishSliceConfig.T;
  availableColumns: readonly string[];
  queriedColumns: readonly string[];
  treatAsAllColumns: boolean;
};

type RowFilterToSqlOptions = {
  filter: PublishSliceConfig.RowFilter;
  availableColumnNames: ReadonlySet<string>;
};

type WriteDashboardPublishConfigOptions = {
  dashboardConfig: Dashboard.T["config"];
  publishConfig: PublishSliceConfig.Dashboard;
};

function _extractDataVizSqlQueries(dashboardConfig: unknown): string[] {
  const sqlQueries: string[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node)) {
      return;
    }
    const dataViz = node as unknown as DataVizLike;
    if (dataViz.type !== "DataViz" || !isPlainObject(dataViz.props)) {
      return;
    }
    const rawSql: unknown = dataViz.props.nlQuery?.rawSql;
    if (isString(rawSql) && rawSql.trim().length > 0) {
      sqlQueries.push(rawSql.trim());
    }
  });
  return sqlQueries;
}

function _extractFilterColumns(dashboardConfig: unknown): string[] {
  const filterColumns: string[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node)) {
      return;
    }
    const filterBlock = node as unknown as DataVizLike;
    if (filterBlock.type !== "Filter" || !isPlainObject(filterBlock.props)) {
      return;
    }
    if (
      isString(filterBlock.props.columnName) &&
      filterBlock.props.columnName.length > 0
    ) {
      filterColumns.push(filterBlock.props.columnName);
    }
  });
  return filterColumns;
}

function _extractDatasetIdsFromSql(sql: string): Dataset.Id[] {
  const datasetIds = Array.from(sql.matchAll(UUID_REGEX)).map((matchResult) => {
    return String(matchResult[0]).toLowerCase() as Dataset.Id;
  });
  return Array.from(new Set(datasetIds));
}

function _parseReferencedColumnNames(
  parser: Parser,
  sqlQuery: string,
): string[] | undefined {
  try {
    const rawColumnNames = parser.columnList(sqlQuery, {
      database: "PostgresQL",
    });
    const columnNames = rawColumnNames.map((entry) => {
      return entry.split("::").at(-1) ?? "";
    });
    return columnNames.some((columnName) => {
      return columnName === "(.*)" || columnName === "*";
    })
      ? undefined
      : columnNames;
  } catch {
    return undefined;
  }
}

function _extractReferencedColumns(
  options: Readonly<{
    dashboardConfig: unknown;
    allDatasetIds: readonly Dataset.Id[];
  }>,
): DashboardReferencedColumns {
  const perDataset = Object.fromEntries(
    options.allDatasetIds.map((datasetId) => {
      return [datasetId, new Set<string>()];
    }),
  ) as Record<Dataset.Id, Set<string>>;
  const unparseable = new Set<Dataset.Id>();
  const allDatasetIds = new Set(options.allDatasetIds);
  const parser = new Parser();

  _extractDataVizSqlQueries(options.dashboardConfig).forEach((sqlQuery) => {
    const datasetIds = _extractDatasetIdsFromSql(sqlQuery).filter(
      (datasetId) => {
        return allDatasetIds.has(datasetId);
      },
    );
    const columnNames = _parseReferencedColumnNames(parser, sqlQuery);

    if (!columnNames) {
      datasetIds.forEach((datasetId) => {
        unparseable.add(datasetId);
      });
      return;
    }

    datasetIds.forEach((datasetId) => {
      columnNames
        .filter((columnName) => {
          return columnName.length > 0;
        })
        .forEach((columnName) => {
          perDataset[datasetId]?.add(columnName);
        });
    });
  });

  const filterColumns = _extractFilterColumns(options.dashboardConfig);
  options.allDatasetIds.forEach((datasetId) => {
    filterColumns.forEach((columnName) => {
      perDataset[datasetId]?.add(columnName);
    });
  });

  return { perDataset, unparseable };
}

function _buildColumnProjection(
  options: Readonly<
    BuildSliceSqlOptions & { availableColumnNames: ReadonlySet<string> }
  >,
): string {
  if (options.treatAsAllColumns) {
    return "*";
  }

  return match(options.sliceConfig)
    .with({ mode: "all_columns" }, () => {
      return "*";
    })
    .with({ mode: "queried" }, () => {
      const columnNames = options.queriedColumns.filter((columnName) => {
        return options.availableColumnNames.has(columnName);
      });
      return columnNames.length > 0
        ? columnNames.map(quoteSqlIdentifier).join(", ")
        : "*";
    })
    .with({ mode: "custom" }, (sliceConfig) => {
      const columnNames = sliceConfig.columns.filter((columnName) => {
        return options.availableColumnNames.has(columnName);
      });
      return columnNames.length > 0
        ? columnNames.map(quoteSqlIdentifier).join(", ")
        : "*";
    })
    .exhaustive();
}

function _buildSliceSql(options: Readonly<BuildSliceSqlOptions>): string {
  const availableColumnNames = new Set(options.availableColumns);
  const projection = _buildColumnProjection({
    ...options,
    availableColumnNames,
  });
  const whereClauses =
    options.sliceConfig.mode === "custom"
      ? options.sliceConfig.rowFilters
          .map((filter) => {
            return _rowFilterToSql({
              filter,
              availableColumnNames,
            });
          })
          .filter(isDefined)
      : [];
  const innerSql = options.baseSelectExpr.trim().replace(/;\s*$/u, "");
  const whereClause =
    whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

  return `SELECT ${projection} FROM (${innerSql}) AS _ava_slice${whereClause}`;
}

function _rowFilterToSql(
  options: Readonly<RowFilterToSqlOptions>,
): string | undefined {
  if (!options.availableColumnNames.has(options.filter.columnName)) {
    return undefined;
  }
  const columnName = quoteSqlIdentifier(options.filter.columnName);

  return match(options.filter)
    .with({ kind: "enum" }, (filter) => {
      const values = filter.values.filter((value) => {
        return value.length > 0;
      });
      return values.length > 0
        ? `${columnName} IN (${values.map(_formatLiteral).join(", ")})`
        : undefined;
    })
    .with({ kind: "range_number" }, (filter) => {
      const rangeClauses = [
        typeof filter.min === "number" && Number.isFinite(filter.min)
          ? `${columnName} >= ${filter.min}`
          : undefined,
        typeof filter.max === "number" && Number.isFinite(filter.max)
          ? `${columnName} <= ${filter.max}`
          : undefined,
      ].filter(isDefined);
      return rangeClauses.length > 0 ? rangeClauses.join(" AND ") : undefined;
    })
    .with({ kind: "range_date" }, (filter) => {
      const rangeClauses = [
        filter.start
          ? `${columnName} >= ${_formatLiteral(filter.start)}`
          : undefined,
        filter.end
          ? `${columnName} <= ${_formatLiteral(filter.end)}`
          : undefined,
      ].filter(isDefined);
      return rangeClauses.length > 0 ? rangeClauses.join(" AND ") : undefined;
    })
    .exhaustive();
}

function _readDashboardPublishConfig(
  dashboardConfig: unknown,
): PublishSliceConfig.Dashboard {
  if (!isPlainObject(dashboardConfig)) {
    return { slices: {} };
  }
  const rawPublishConfig = dashboardConfig["__publishConfig"];
  if (!isPlainObject(rawPublishConfig)) {
    return { slices: {} };
  }
  const slices = rawPublishConfig.slices;
  return isPlainObject(slices)
    ? { slices: slices as PublishSliceConfig.Dashboard["slices"] }
    : { slices: {} };
}

function _writeDashboardPublishConfig(
  options: Readonly<WriteDashboardPublishConfigOptions>,
): Dashboard.T["config"] {
  const dashboardConfig = isPlainObject(options.dashboardConfig)
    ? (options.dashboardConfig as Record<string, Dashboard.T["config"]>)
    : {};
  return {
    ...dashboardConfig,
    __publishConfig: options.publishConfig,
  };
}

/**
 * Builds publication SQL and persists slice configuration for dashboards.
 */
export const DashboardSliceBuilder = {
  /** Returns referenced columns for visualizations and filters. */
  extractReferencedColumns: _extractReferencedColumns,
  /** Returns publication SQL for one dataset slice. */
  buildSliceSql: _buildSliceSql,
  /** Returns a validated publication configuration from dashboard data. */
  readDashboardPublishConfig: _readDashboardPublishConfig,
  /** Returns dashboard data with the publication configuration attached. */
  writeDashboardPublishConfig: _writeDashboardPublishConfig,
};
