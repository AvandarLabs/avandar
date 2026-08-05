import { useRouterState } from "@tanstack/react-router";
import { pickProps } from "@utils";
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { useMemo } from "react";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

/** Returns a stable page context until its underlying content changes. */
export function useChatPageContext(): ChatPageContext.T {
  const pathname = useRouterState({
    select: (s) => {
      return s.location.pathname;
    },
  });
  const { openDataset, rawSql, lastQueryError, lastResultColumns } =
    DataExplorerStateManager.useState();
  const openDatasetId = openDataset?.datasetId;

  return useMemo<ChatPageContext.T>(() => {
    if (pathname.includes("/data-explorer")) {
      const resultColumns: ChatPageContext.ResultColumn[] | undefined =
        lastResultColumns?.map(pickProps(["name", "dataType"]));
      return ChatPageContext.createDataExplorerViewContext({
        openDatasetId,
        lastSql: rawSql,
        lastResultColumns: resultColumns,
        lastError: lastQueryError,
      });
    }
    if (pathname.includes("/dashboards")) {
      const dashboardId = pathname.match(
        /\/dashboards\/edit\/([0-9a-f-]{36})/i,
      )?.[1];
      return ChatPageContext.createDashboardsViewContext({ dashboardId });
    }
    if (
      pathname.includes("/data-import") ||
      pathname.includes("/data-sources")
    ) {
      return ChatPageContext.createDataSourcesViewContext();
    }
    return ChatPageContext.createOtherViewContext();
  }, [pathname, openDatasetId, rawSql, lastQueryError, lastResultColumns]);
}
