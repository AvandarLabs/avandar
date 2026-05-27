import { useRouterState } from "@tanstack/react-router";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

/**
 * Returns the chat's view of the current page. Used both to drive the empty
 * state (which suggestions to show) and to tell the backend which tools are
 * available on this turn. Reads from the router and the Data Explorer state
 * so the panel always reflects what the user is looking at right now.
 */
export function useChatPageContext(): ChatPageContext.T {
  const pathname = useRouterState({
    select: (s) => {
      return s.location.pathname;
    },
  });
  const { openDataset, rawSQL, lastQueryError } =
    DataExplorerStateManager.useState();

  if (pathname.includes("/data-explorer")) {
    return {
      app: "data-explorer",
      ...(openDataset ? { openDatasetId: openDataset.datasetId } : {}),
      ...(rawSQL ? { lastSql: rawSQL } : {}),
      ...(lastQueryError ? { lastError: lastQueryError } : {}),
    };
  }
  if (pathname.includes("/data-import") || pathname.includes("/data-sources")) {
    return { app: "data-sources" };
  }
  if (pathname.includes("/dashboards")) {
    return { app: "dashboards" };
  }
  return { app: "other" };
}
