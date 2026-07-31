import { useEffect } from "react";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { useDashboardPuck } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuck";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

/**
 * Applies chat-queued P-blocks through Puck's store. Puck only reads the `data`
 * prop on mount; updating parent React state alone does not refresh the canvas.
 */
export function DashboardChatPendingBlocksSync(): null {
  const dispatch = useDashboardPuck((store) => {
    return store.dispatch;
  });
  const { pendingBlocks } = DashboardEditorStateManager.useState();
  const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();

  useEffect(() => {
    if (pendingBlocks.length === 0) {
      return;
    }

    const blocksToAdd = pendingBlocks.map((pending) => {
      return pending.block;
    });

    dispatch({
      type: "setData",
      data: (previous) => {
        const prevContent = (previous.content ?? []) as AvaPageData["content"];
        return {
          ...previous,
          content: [...prevContent, ...blocksToAdd],
        };
      },
    });

    dashboardEditorDispatch.clearPendingBlocks();
  }, [pendingBlocks, dispatch, dashboardEditorDispatch]);

  return null;
}
