import { useMemo } from "react";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
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
      vizConfig: AvaVizConfig;
    };

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
  const schema = useQueryResultColumnBindings({
    scopeKey: `${workspaceId}:chat-result:${sql}`,
    sqlKey: sql,
    resultSqlKey: queryResult?.executedSql,
    result: isLoading ? undefined : queryResult,
    projections,
    initialRegistry: undefined,
  });
  return schema?.columns;
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
  const emptyQuery = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);
  const [queryResult, isLoading, query] = useDataQuery({
    query: emptyQuery,
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
  const vizConfig = useMemo(() => {
    return AvaVizConfigs.hydrateFromQueryResult(
      AvaVizConfigs.makeEmptyConfig(result.chartType),
      columns ?? [],
    );
  }, [result.chartType, columns]);
  if (query.isError) {
    return { status: "unavailable" };
  }
  if (isLoading || !queryResult || !columns) {
    return { status: "loading" };
  }
  return {
    status: "ready",
    columns,
    rawColumns: queryResult.columns,
    data: queryResult.data,
    dateColumns: getDateColumns(columns, queryResult.data),
    vizConfig,
  };
}
