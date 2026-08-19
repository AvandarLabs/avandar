import { useThreadRuntime } from "@assistant-ui/react";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { makeLikeFromThreadMessage } from "./threadMessageHelpers";

/**
 * Keeps a hidden trailing view-change message in sync with the current page
 * snapshot.
 */
export function useChatViewTranscript(): void {
  const threadRuntime = useThreadRuntime();
  const { app, openDatasetId, dashboardId } = useChatPageContext();
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });
  const snapshot = useMemo(() => {
    return ChatViewEvent.makeSnapshotFromPageContext({
      pageContext: { app, openDatasetId, dashboardId },
      route: pathname,
    });
  }, [pathname, app, openDatasetId, dashboardId]);

  useEffect(
    function syncViewEventIntoThread() {
      const current = threadRuntime
        .getState()
        .messages.map(makeLikeFromThreadMessage);
      const coalescedMessages = ChatViewEvent.applyToMessages({
        messages: current,
        snapshot,
      });
      if (JSON.stringify(current) === JSON.stringify(coalescedMessages)) {
        return;
      }
      threadRuntime.reset(coalescedMessages);
    },
    [snapshot, threadRuntime],
  );
}
