import { makeObject, prop } from "@utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { structuredQueryToSQL } from "$/models/queries/StructuredQuery/structuredQueryToSQL";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";

export type DashboardManualQueryState = {
  query: PartialStructuredQuery;
  isStructuredQueryInSync: boolean;
  sqlSyncWarnings: readonly string[];
  /** Whether the SQL parser is ready (dataset metadata loaded). */
  isParserReady: boolean;
  handlers: ManualQueryFormHandlers;
};

/**
 * Backs the dashboard DataViz block's manual query form. Mirrors the slice of
 * `DataExplorerStateManager` that the form depends on, but keeps the
 * structured query in local React state and writes the regenerated SQL back
 * to the block's `nlQuery.rawSql` via `onRawSqlChange`. The structured query
 * itself is *not* persisted — it is re-derived from `rawSql` whenever the
 * incoming SQL changes (e.g. when the user pastes new SQL or runs an AI
 * generation).
 */
export function useDashboardManualQueryState(opts: {
  rawSql: string;
  onRawSqlChange: (nextSql: string) => void;
}): DashboardManualQueryState {
  const { rawSql, onRawSqlChange } = opts;
  const { parseSql, isReady } = useSqlToStructuredQuery();

  const [query, setQuery] = useState<PartialStructuredQuery>(
    StructuredQuery.makeEmpty(),
  );
  const [isStructuredQueryInSync, setIsStructuredQueryInSync] = useState(true);
  const [sqlSyncWarnings, setSqlSyncWarnings] = useState<readonly string[]>([]);

  /**
   * Track the most recent SQL we mirrored into the structured query so we
   * don't fight our own writes. When the user edits the form, we regenerate
   * SQL and call `onRawSqlChange`; the parent then re-renders with the new
   * `rawSql`, which we want to ignore here.
   */
  const lastSyncedSqlRef = useRef<string>("");

  // When external `rawSql` changes (e.g. an AI generation arrived) and the
  // parser is ready, re-derive the structured query.
  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (rawSql === lastSyncedSqlRef.current) {
      return;
    }
    if (rawSql.trim() === "") {
      setQuery(StructuredQuery.makeEmpty());
      setIsStructuredQueryInSync(true);
      setSqlSyncWarnings([]);
      lastSyncedSqlRef.current = rawSql;
      return;
    }
    const mapping = parseSql(rawSql);
    setQuery(mapping.query);
    setIsStructuredQueryInSync(mapping.isFullyMapped);
    setSqlSyncWarnings(mapping.unmappedReasons);
    lastSyncedSqlRef.current = rawSql;
  }, [rawSql, isReady, parseSql]);

  // Regenerate SQL from a new structured query and push it up.
  const applyQueryChange = useCallback(
    (nextQuery: PartialStructuredQuery): void => {
      setQuery(nextQuery);
      setIsStructuredQueryInSync(true);
      setSqlSyncWarnings([]);
      let nextSql = "";
      if (nextQuery.dataSource !== undefined) {
        try {
          nextSql = structuredQueryToSQL(nextQuery);
        } catch {
          nextSql = "";
        }
      }
      lastSyncedSqlRef.current = nextSql;
      onRawSqlChange(nextSql);
    },
    [onRawSqlChange],
  );

  const handlers: ManualQueryFormHandlers = {
    onSetDataSource: (dataSource: QueryDataSource | undefined) => {
      applyQueryChange({ ...query, dataSource } as PartialStructuredQuery);
    },
    onSetColumns: (columns: readonly QueryColumn.T[]) => {
      const newColumnIds = columns.map(prop("id"));
      const newAggregations = makeObject(newColumnIds, {
        valueFn: (colId) => {
          return query.aggregations[colId] ?? "none";
        },
      });
      applyQueryChange({
        ...query,
        queryColumns: columns,
        aggregations: newAggregations,
      } as PartialStructuredQuery);
    },
    onSetColumnAggregation: (payload: {
      columnId: QueryColumn.Id;
      aggregation: QueryAggregationType.T;
    }) => {
      const { columnId, aggregation } = payload;
      const newQueryColumns = query.queryColumns.map((col) => {
        if (col.id === columnId && col.aggregation !== aggregation) {
          return { ...col, aggregation };
        }
        return col;
      });
      applyQueryChange({
        ...query,
        queryColumns: newQueryColumns,
        aggregations: { ...query.aggregations, [columnId]: aggregation },
      } as PartialStructuredQuery);
    },
    onSetOrderByColumn: (columnId: QueryColumnId | undefined) => {
      applyQueryChange({
        ...query,
        orderByColumn: columnId,
      } as PartialStructuredQuery);
    },
    onSetOrderByDirection: (direction: OrderByDirection | undefined) => {
      applyQueryChange({
        ...query,
        orderByDirection: direction,
      } as PartialStructuredQuery);
    },
    onSetFilters: (filters: QueryFilterGroup) => {
      applyQueryChange({ ...query, filters } as PartialStructuredQuery);
    },
    onSetLimit: (limit: number | undefined) => {
      applyQueryChange({ ...query, limit } as PartialStructuredQuery);
    },
  };

  return {
    query,
    isStructuredQueryInSync,
    sqlSyncWarnings,
    isParserReady: isReady,
    handlers,
  };
}
