import { pickProps } from "@avandar/utils";
import { useRouterState } from "@tanstack/react-router";
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { useMemo } from "react";
import { makeChatPageContextFromPathname } from "@/components/ChatPanel/makeChatPageContextFromPathname/makeChatPageContextFromPathname";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

/** Returns a stable page context until its underlying content changes. */
export function useChatPageContext(): ChatPageContext.T {
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });
  const { openDataset, rawSql, lastQueryError, lastResultColumns } =
    DataExplorerStateManager.useState();
  const openDatasetId = openDataset?.datasetId;

  return useMemo<ChatPageContext.T>(() => {
    const resultColumns: ChatPageContext.ResultColumn[] | undefined =
      lastResultColumns?.map(pickProps(["name", "dataType"]));
    return makeChatPageContextFromPathname({
      pathname,
      openDatasetId,
      lastSql: rawSql,
      lastResultColumns: resultColumns,
      lastError: lastQueryError,
    });
  }, [pathname, openDatasetId, rawSql, lastQueryError, lastResultColumns]);
}
