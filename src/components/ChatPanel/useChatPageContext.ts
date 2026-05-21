import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatPageContext } from "$/types/chat.types";

/**
 * Returns the chat's view of the current page. Used both to drive the empty
 * state (which suggestions to show) and to tell the backend which tools are
 * available on this turn. Reads from the router and the Data Explorer state
 * so the panel always reflects what the user is looking at right now.
 *
 * The returned object is memoized by **content**, not by render. Without
 * this, the chat runtime's `useMemo([..., pageContext, ...])` adapter
 * busts on every parent render, and assistant-ui's `__internal_setOptions`
 * effect (which runs on every render) thrashes the in-flight turn. Bug
 * #29 — "after some back-and-forth the canvas stops updating despite the
 * assistant returning correct SQL" — traces back to this object
 * instability.
 */
export function useChatPageContext(): ChatPageContext {
  const pathname = useRouterState({
    select: (s) => {
      return s.location.pathname;
    },
  });
  const { openDataset, rawSQL, lastQueryError, lastResultColumns } =
    DataExplorerStateManager.useState();
  const { activeDashboardId } = DashboardEditorStateManager.useState();
  const openDatasetId = openDataset?.datasetId;

  return useMemo<ChatPageContext>(() => {
    if (pathname.includes("/data-explorer")) {
      const resultColumns = lastResultColumns?.map((c) => {
        return { name: c.name, dataType: c.dataType };
      });
      return {
        app: "data-explorer",
        ...(openDatasetId ? { openDatasetId } : {}),
        ...(rawSQL ? { lastSql: rawSQL } : {}),
        ...(resultColumns && resultColumns.length > 0 ?
          { lastResultColumns: resultColumns }
        : {}),
        ...(lastQueryError ? { lastError: lastQueryError } : {}),
      };
    }
    if (
      pathname.includes("/data-import") ||
      pathname.includes("/data-sources")
    ) {
      return { app: "data-sources" };
    }
    if (pathname.includes("/dashboards")) {
      return {
        app: "dashboards",
        ...(activeDashboardId ? { dashboardId: activeDashboardId } : {}),
      };
    }
    return { app: "other" };
  }, [
    pathname,
    openDatasetId,
    rawSQL,
    lastQueryError,
    lastResultColumns,
    activeDashboardId,
  ]);
}
