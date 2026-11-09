import { useMemo } from "react";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { useCategorySplitChartInput } from "@/components/VisualizationContainer/useCategorySplitChartInput/useCategorySplitChartInput";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { ChartInput } from "@/components/VisualizationContainer/useCategorySplitChartInput/useCategorySplitChartInput";
import type { UnknownDataFrame } from "@avandar/utils";

/** What the result card draws. */
export type AgentQueryResultView =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "ready";
      columns: readonly QueryResult.ColumnWithId[];
      rawColumns: readonly QueryResult.Column[];
      data: UnknownDataFrame;
      dateColumns: ReadonlySet<string>;
      vizConfig: AvaVizConfig.T;
    };

/**
 * The structured query every chat result passes alongside its SQL. Shared at
 * module level because `useDataQuery` keys its cache on it and each
 * `makeEmpty` call mints a new id: a query per card would re-run the SQL on
 * every remount and leave an orphaned cache entry each time.
 */
const EMPTY_QUERY = StructuredQuery.makeEmpty();

/** Stable stand-ins while the result loads, so memoized values hold. */
const NO_COLUMNS: readonly QueryResult.ColumnWithId[] = [];
const NO_ROWS: UnknownDataFrame = [];

/**
 * Stacks a split bar or area chart, so the chat card shows each category's
 * share of the total. Any other chart is returned as it is.
 */
function _stackSplitVizConfig(vizConfig: AvaVizConfig.T): AvaVizConfig.T {
  if (vizConfig.vizType === "bar") {
    return { ...vizConfig, layout: "stack" };
  }
  return vizConfig.vizType === "area"
    ? { ...vizConfig, layout: "stacked" }
    : vizConfig;
}

/**
 * Binds the columns of a finished result of `sql` to column IDs, the way
 * the Data Explorer does for SQL typed in its editor. Undefined until the
 * result of `sql` is bound.
 */
function useResultColumns(
  options: Readonly<{
    sql: string;
    workspaceId: Workspace.Id;
    queryResult:
      | (QueryResult.T & { executedSql: string | undefined })
      | undefined;
    isLoading: boolean;
  }>,
): readonly QueryResult.ColumnWithId[] | undefined {
  const { sql, workspaceId, queryResult, isLoading } = options;
  const projections = useMemo(() => {
    return makeProjectionDescriptorsFromSql({
      sql,
      columns: queryResult?.columns ?? [],
    });
  }, [sql, queryResult?.columns]);
  const scopeKey = useMemo(() => {
    return `${workspaceId}:chat-result:${sql}`;
  }, [workspaceId, sql]);
  const schema = useQueryResultColumnBindings({
    scopeKey,
    sqlKey: sql,
    resultSqlKey: queryResult?.executedSql,
    result: isLoading ? undefined : queryResult,
    projections,
    initialRegistry: undefined,
  });
  return schema?.columns;
}

/**
 * Builds the chart the card draws from a bound result: the chart type's
 * config filled from the columns, with a long result split into one series
 * per category, and a split bar or area chart stacked.
 */
function useResultChartInput(
  options: Readonly<{
    chartType: AgentQueryResultData["chartType"];
    columns: readonly QueryResult.ColumnWithId[];
    data: UnknownDataFrame;
  }>,
): ChartInput {
  const { chartType, columns, data } = options;
  const vizConfig = useMemo(() => {
    return AvaVizConfigs.hydrateFromQueryResult(
      AvaVizConfigs.makeEmptyConfig(chartType),
      columns,
    );
  }, [chartType, columns]);
  const dateColumns = useMemo(() => {
    return getDateColumns(columns, data);
  }, [columns, data]);
  // A table, and every chart that is not split, gets the rows as they came.
  const { splitColumnName, ...chartInput } = useCategorySplitChartInput({
    columns,
    data,
    dateColumns,
    vizConfig,
  });
  const chartVizConfig = useMemo(() => {
    return splitColumnName === undefined
      ? chartInput.vizConfig
      : _stackSplitVizConfig(chartInput.vizConfig);
  }, [splitColumnName, chartInput.vizConfig]);
  return { ...chartInput, vizConfig: chartVizConfig };
}

/**
 * Runs a stored agent result the way the Data Explorer runs a query (its
 * query hook, column bindings, and chart config), so the chat card draws
 * the same chart the explorer would.
 */
export function useAgentQueryResultView(
  result: AgentQueryResultData,
  workspaceId: Workspace.Id,
): AgentQueryResultView {
  const [queryResult, isLoading, query] = useDataQuery({
    query: EMPTY_QUERY,
    rawSql: result.sql,
    auth: "workspace",
    workspaceId,
    analyticsSurface: "chat_result",
  });
  const columns = useResultColumns({
    sql: result.sql,
    workspaceId,
    queryResult,
    isLoading,
  });
  const chartInput = useResultChartInput({
    chartType: result.chartType,
    columns: columns ?? NO_COLUMNS,
    data: queryResult?.data ?? NO_ROWS,
  });
  if (query.isError) {
    return { status: "unavailable" };
  }
  if (isLoading || !queryResult || !columns) {
    return { status: "loading" };
  }
  return {
    status: "ready",
    rawColumns: queryResult.columns,
    ...chartInput,
  };
}
