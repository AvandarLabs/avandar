import { useEffect, useMemo, useRef } from "react";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { makeToolbarFactsFromQueryResult } from "@/views/DataExplorerApp/makeToolbarFactsFromQueryResult/makeToolbarFactsFromQueryResult";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { ExplorerPluginResult } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
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

type QueryResults = Options["queryResults"];

function _buildFactsFromQueryResults(queryResults: QueryResults): WhenFacts {
  return makeToolbarFactsFromQueryResult({
    hasResult: queryResults !== undefined,
    rowCount: queryResults?.data.length ?? 0,
    columns: queryResults?.columns ?? [],
  });
}

function _buildContextGetter(
  queryResults: QueryResults,
): PluginContext["getContext"] {
  if (queryResults === undefined) {
    return undefined;
  }
  const { columns, data } = queryResults;
  return () => {
    return {
      slotId: "dataExplorer.toolbar",
      queryHandle: QueryHandleRegistry.getOrCreate(data),
      columns: columns.map((column) => {
        return { name: column.name, dataType: column.dataType };
      }),
      rowCount: data.length,
    };
  };
}

function _makeStoreResultFromQueryResults(
  queryResults: QueryResults,
): ExplorerPluginResult | undefined {
  if (queryResults === undefined) {
    return undefined;
  }
  return {
    columns: queryResults.columns.map((column) => {
      return { name: column.name, dataType: column.dataType };
    }),
    rows: queryResults.data,
  };
}

/**
 * Keeps the store on the last settled result: a run in flight leaves it as
 * it is, and unmounting clears it only while the store still holds what this
 * hook published, so another explorer's newer result is not erased.
 */
function usePublishSettledResultToStore(options: Options): void {
  const { queryResults, isLoadingResults } = options;
  const publishedResultRef = useRef<ExplorerPluginResult | undefined>(
    undefined,
  );

  useEffect(
    function publishSettledResultToStore() {
      if (!isLoadingResults) {
        const result = _makeStoreResultFromQueryResults(queryResults);
        publishedResultRef.current = result;
        ExplorerPluginResultStore.set(result);
      }
    },
    [queryResults, isLoadingResults],
  );

  useEffect(function clearStoreOnUnmount() {
    return () => {
      const publishedResult = publishedResultRef.current;
      if (
        publishedResult !== undefined &&
        ExplorerPluginResultStore.get() === publishedResult
      ) {
        ExplorerPluginResultStore.clear();
      }
    };
  }, []);
}

/**
 * Builds what plugin commands in the Data Explorer toolbar need: a getter for
 * the invocation context they run on and the `when` facts that decide which
 * of them show. The getter is undefined while there is no settled result to
 * run on, so commands are disabled during a run. The facts keep describing the
 * last settled result during a run, so the buttons do not disappear and come
 * back. The getter registers the result's rows in `QueryHandleRegistry` only
 * when called, which `PluginMenuSlot` does when a command is clicked, so
 * results no command runs on are never held there. Both values keep their
 * identity until the result or the loading flag changes.
 */
export function useDataExplorerPluginContext(options: Options): PluginContext {
  const { queryResults, isLoadingResults } = options;
  const lastSettledResultsRef = useRef<QueryResults>(undefined);
  const factsResults = isLoadingResults
    ? lastSettledResultsRef.current
    : queryResults;

  useEffect(
    function rememberLastSettledResults() {
      if (!isLoadingResults) {
        lastSettledResultsRef.current = queryResults;
      }
    },
    [queryResults, isLoadingResults],
  );

  usePublishSettledResultToStore(options);

  const facts = useMemo(() => {
    return _buildFactsFromQueryResults(factsResults);
  }, [factsResults]);

  return useMemo(() => {
    return {
      getContext: isLoadingResults
        ? undefined
        : _buildContextGetter(queryResults),
      facts,
    };
  }, [queryResults, isLoadingResults, facts]);
}
