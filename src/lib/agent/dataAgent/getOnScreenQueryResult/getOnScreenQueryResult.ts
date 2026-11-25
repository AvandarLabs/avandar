import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type {
  DataExplorerToolbarContext,
  QueryHandle,
} from "@avandar/plugin-sdk";

type UnknownRow = Readonly<Record<string, unknown>>;

/**
 * The query result the user is looking at when the data agent calls a plugin
 * AI tool, registered under a query handle the plugin can read rows through.
 * `source` says whether it came from the Data Explorer or from a chat result.
 * `kind: "none"` means nothing usable is on screen.
 */
export type OnScreenQueryResult =
  | { kind: "none" }
  | {
      kind: "rows";
      source: "explorer" | "chat";
      handle: QueryHandle;
      columns: DataExplorerToolbarContext["columns"];
      rows: readonly UnknownRow[];
      rowCount: number;
    };

function _buildRowsResult(options: {
  source: "explorer" | "chat";
  columns: DataExplorerToolbarContext["columns"];
  rows: readonly UnknownRow[];
}): OnScreenQueryResult {
  return {
    kind: "rows",
    source: options.source,
    handle: QueryHandleRegistry.getOrCreate(options.rows),
    columns: options.columns,
    rows: options.rows,
    rowCount: options.rows.length,
  };
}

async function _buildChatResult(options: {
  chatResults: readonly AgentQueryResultData[];
  runQuery: (sql: string) => Promise<QueryResult.T | { error: string }>;
}): Promise<OnScreenQueryResult> {
  const lastChatResult = options.chatResults.at(-1);
  if (!lastChatResult) {
    return { kind: "none" };
  }
  // A query error can quote a cell value, so it never reaches the result.
  const queryResult = await Promise.resolve()
    .then(() => {
      return options.runQuery(lastChatResult.sql);
    })
    .catch(() => {
      return undefined;
    });
  if (!queryResult || "error" in queryResult) {
    return { kind: "none" };
  }
  return _buildRowsResult({
    source: "chat",
    columns: queryResult.columns.map((column) => {
      return { name: column.name, dataType: column.dataType };
    }),
    rows: queryResult.data,
  });
}

/**
 * Gets the query result on screen for a plugin AI tool to run on. On the
 * Data Explorer that is only the explorer's settled result. Elsewhere it is
 * the last chat result, run again through `runQuery`. Any failure, including
 * a query error, is `{ kind: "none" }` with no error text attached.
 *
 * Use it when the data agent needs rows to hand a plugin tool, for example
 * to build the tool's invocation context.
 */
export async function getOnScreenQueryResult(options: {
  isDataExplorer: boolean;
  chatResults: readonly AgentQueryResultData[];
  runQuery: (sql: string) => Promise<QueryResult.T | { error: string }>;
}): Promise<OnScreenQueryResult> {
  if (options.isDataExplorer) {
    const explorerResult = ExplorerPluginResultStore.get();
    return explorerResult
      ? _buildRowsResult({ source: "explorer", ...explorerResult })
      : { kind: "none" };
  }
  return _buildChatResult(options);
}
