import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

export type DashboardEditorPendingBlock = {
  /**
   * The block payload to append to the active dashboard's content. We carry
   * the raw `unknown` shape because Puck doesn't expose a fully-typed
   * "ContentItem" type in our @puckeditor/core version.
   */
  block: AvaPageData["content"][number];
  /** Stable id from the LLM so duplicate emits can be de-duplicated. */
  pendingId: string;
};

export type DashboardEditorAppState = {
  /**
   * Set only when a dashboard editor is currently mounted. The chat panel
   * reads this to decide whether it can offer the "add block" tool to the
   * model and to attach the right metadata to the LLM call.
   */
  activeDashboardId: string | undefined;

  /**
   * Pending blocks queued by the chat panel that the editor view should
   * append to its in-memory Puck data on the next render and then clear via
   * `consumePendingBlock`.
   */
  pendingBlocks: readonly DashboardEditorPendingBlock[];
};

const INITIAL_STATE: DashboardEditorAppState = {
  activeDashboardId: undefined,
  pendingBlocks: [],
};

/**
 * Workspace-scoped state for the currently-active dashboard editor. Lets the
 * chat panel push generated P-blocks into the dashboard without depending on
 * the editor instance directly. Mounted at the WorkspaceLayout so any
 * dashboard route can populate it.
 */
export const DashboardEditorStateManager = createAppStateManager({
  name: "DashboardEditor",
  initialState: INITIAL_STATE,
  actions: {
    /**
     * Register the dashboard whose editor is currently visible. Called by
     * `DashboardEditorView` on mount and on dashboard id change.
     */
    setActiveDashboard: (
      state: DashboardEditorAppState,
      dashboardId: string | undefined,
    ): DashboardEditorAppState => {
      if (state.activeDashboardId === dashboardId) {
        return state;
      }
      return { ...state, activeDashboardId: dashboardId, pendingBlocks: [] };
    },

    /** Queue a new block for the editor to append to its Puck data. */
    queuePendingBlock: (
      state: DashboardEditorAppState,
      block: DashboardEditorPendingBlock,
    ): DashboardEditorAppState => {
      const alreadyQueued = state.pendingBlocks.some((b) => {
        return b.pendingId === block.pendingId;
      });
      if (alreadyQueued) {
        return state;
      }
      return { ...state, pendingBlocks: [...state.pendingBlocks, block] };
    },

    /**
     * Drain the queue; the editor calls this after it appends the blocks.
     *
     * TODO(jpsyx): this is an antipattern and this should be removed once
     * we lift the puck data state from DashboardEditorView into the
     * DashboardEditorStateManager.
     */
    clearPendingBlocks: (
      state: DashboardEditorAppState,
    ): DashboardEditorAppState => {
      if (state.pendingBlocks.length === 0) {
        return state;
      }
      return { ...state, pendingBlocks: [] };
    },
  },
});
