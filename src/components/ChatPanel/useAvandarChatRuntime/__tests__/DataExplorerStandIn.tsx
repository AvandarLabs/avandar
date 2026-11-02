import { useEffect } from "react";
import { harness } from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";

/**
 * Runs the explorer's query and records its outcome the way `DataExplorerApp`
 * does (`useDataQuery` plus its `syncLastQueryError` and
 * `syncVizFromQueryResult` effects), so the chat sees the same explorer state
 * it sees in the app.
 */
export function DataExplorerStandIn(): React.ReactNode {
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();
  const [queryResults, isLoadingResults, dataQuery] = useDataQuery({
    query: state.query,
    rawSql: state.rawSql,
    isStructuredQueryInSync: state.isStructuredQueryInSync,
    auth: "workspace",
    workspaceId: workspace.id,
    analyticsSurface: "data_explorer",
    analyticsTrigger: state.queryTrigger,
  });
  harness.explorerState = state;
  harness.explorerDispatch = dispatch;
  harness.queryStatus = state.rawSql ? dataQuery.status : undefined;

  useEffect(
    function syncLastQueryError() {
      const message = dataQuery.isError ? dataQuery.error.message : undefined;
      if (message !== state.lastQueryError) {
        dispatch.setLastQueryError(message);
      }
    },
    [dataQuery.isError, dataQuery.error, state.lastQueryError, dispatch],
  );

  useEffect(
    function syncVizFromQueryResult() {
      if (!isLoadingResults && queryResults?.columns) {
        dispatch.syncVizFromQueryResult(queryResults.columns);
      }
    },
    [isLoadingResults, queryResults, dispatch],
  );
  return null;
}
