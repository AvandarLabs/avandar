import { useMemo } from "react";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { makeToolbarFactsFromQueryResult } from "@/views/DataExplorerApp/makeToolbarFactsFromQueryResult/makeToolbarFactsFromQueryResult";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { DataExplorerToolbarContext } from "@avandar/plugin-sdk";

type Options = Readonly<{
  /** The result the explorer is showing, or undefined before any run. */
  queryResults:
    | Readonly<{
        columns: readonly QueryResult.Column[];
        data: ReadonlyArray<Readonly<Record<string, unknown>>>;
      }>
    | undefined;

  /** Whether a run is in flight, so `queryResults` may be out of date. */
  isLoadingResults: boolean;
}>;

type PluginContext = Readonly<{
  getContext: (() => DataExplorerToolbarContext) | undefined;
  facts: WhenFacts;
}>;

/**
 * Builds what plugin commands in the Data Explorer toolbar need: a getter for
 * the invocation context they run on and the `when` facts that decide which
 * of them show. The getter is undefined while there is no settled result to
 * run on. It registers the result's rows in `QueryHandleRegistry` only when
 * called, which `PluginMenuSlot` does when a command is clicked, so results
 * no command runs on are never held there. Both values keep their identity
 * until the result or the loading flag changes.
 */
export function useDataExplorerPluginContext(options: Options): PluginContext {
  const { queryResults, isLoadingResults } = options;
  return useMemo(() => {
    if (isLoadingResults || queryResults === undefined) {
      return {
        getContext: undefined,
        facts: makeToolbarFactsFromQueryResult({
          hasResult: false,
          rowCount: 0,
          columns: [],
        }),
      };
    }
    const { columns, data } = queryResults;
    return {
      getContext: () => {
        return {
          slotId: "dataExplorer.toolbar",
          queryHandle: QueryHandleRegistry.getOrCreate(data),
          columns: columns.map((column) => {
            return { name: column.name, dataType: column.dataType };
          }),
          rowCount: data.length,
        };
      },
      facts: makeToolbarFactsFromQueryResult({
        hasResult: true,
        rowCount: data.length,
        columns,
      }),
    };
  }, [queryResults, isLoadingResults]);
}
