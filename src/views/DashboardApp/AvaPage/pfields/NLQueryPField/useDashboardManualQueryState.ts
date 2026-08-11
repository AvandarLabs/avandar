import { makeObject, prop } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { useCallback, useMemo } from "react";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { OrderByDirection } from "$/models/queries/StructuredQuery/StructuredQuery.types";

export type DashboardManualQueryState = {
  query: StructuredQuery.Partial;
  isStructuredQueryInSync: boolean;
  sqlSyncWarnings: readonly string[];
  /** Whether the SQL parser is ready (dataset metadata loaded). */
  isParserReady: boolean;
  handlers: ManualQueryFormHandlers;
};

type Options = {
  rawSql: string;
  onRawSqlChange: (nextSql: string) => void;
};

/**
 * Backs the dashboard DataViz block's manual query form. Mirrors the slice of
 * `DataExplorerStateManager` that the form depends on, but keeps the
 * structured query derived from the block's `nlQuery.rawSql` and writes
 * regenerated SQL back through `onRawSqlChange`.
 */
export function useDashboardManualQueryState(
  options: Readonly<Options>,
): DashboardManualQueryState {
  const { rawSql, onRawSqlChange } = options;
  const { parseSql, isReady } = useSqlToStructuredQuery();
  const sqlMapping = useMemo(() => {
    if (!isReady || rawSql.trim() === "") {
      return {
        query: StructuredQuery.makeEmpty(),
        isFullyMapped: true,
        unmappedReasons: [] as readonly string[],
      };
    }
    return parseSql(rawSql);
  }, [isReady, parseSql, rawSql]);
  const query = sqlMapping.query;

  // Regenerate SQL from a new structured query and push it up.
  const applyQueryChange = useCallback(
    (nextQuery: StructuredQuery.Partial): void => {
      const nextSql = (() => {
        if (nextQuery.dataSource === undefined) {
          return "";
        }
        try {
          return structuredQueryToSql(nextQuery);
        } catch {
          return "";
        }
      })();
      onRawSqlChange(nextSql);
    },
    [onRawSqlChange],
  );

  const handlers: ManualQueryFormHandlers = {
    onSetDataSource: (
      dataSource: QueryDataSource.T | undefined,
      changeOptions?: { limit?: number },
    ) => {
      applyQueryChange({
        ...query,
        dataSource,
        ...(changeOptions?.limit !== undefined ?
          { limit: changeOptions.limit }
        : {}),
      } as StructuredQuery.Partial);
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
      } as StructuredQuery.Partial);
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
      } as StructuredQuery.Partial);
    },
    onSetOrderByColumn: (columnId: QueryColumn.Id | undefined) => {
      applyQueryChange({
        ...query,
        orderByColumn: columnId,
      } as StructuredQuery.Partial);
    },
    onSetOrderByDirection: (direction: OrderByDirection | undefined) => {
      applyQueryChange({
        ...query,
        orderByDirection: direction,
      } as StructuredQuery.Partial);
    },
    onSetFilters: (filters: QueryFilterGroup) => {
      applyQueryChange({ ...query, filters } as StructuredQuery.Partial);
    },
    onSetLimit: (limit: number | undefined) => {
      applyQueryChange({ ...query, limit } as StructuredQuery.Partial);
    },
  };

  return {
    query,
    isStructuredQueryInSync: sqlMapping.isFullyMapped,
    sqlSyncWarnings: sqlMapping.unmappedReasons,
    isParserReady: isReady,
    handlers,
  };
}
