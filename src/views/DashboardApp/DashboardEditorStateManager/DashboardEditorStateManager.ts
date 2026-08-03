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

  /** Current in-memory Puck data for the active editor. */
  editorData: AvaPageData | undefined;

  /** Changes not yet persisted to the dashboard record. */
  hasUnsavedChanges: boolean;

  /** Revision used to remount Puck when a different dashboard is loaded. */
  editorRevision: number;

  /** Generated block ids already appended to the active dashboard. */
  appendedBlockIds: readonly string[];
};

const INITIAL_STATE: DashboardEditorAppState = {
  activeDashboardId: undefined,
  editorData: undefined,
  hasUnsavedChanges: false,
  editorRevision: 0,
  appendedBlockIds: [],
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
      activeDashboard:
        | { dashboardId: string; editorData: AvaPageData }
        | undefined,
    ): DashboardEditorAppState => {
      if (state.activeDashboardId === activeDashboard?.dashboardId) {
        return state;
      }
      return {
        ...state,
        activeDashboardId: activeDashboard?.dashboardId,
        editorData: activeDashboard?.editorData,
        hasUnsavedChanges: false,
        editorRevision: state.editorRevision + 1,
        appendedBlockIds: [],
      };
    },

    /**
     * Append a generated block to the active editor's Puck data and bump
     * `editorRevision`. Puck seeds its internal store from the `data` prop only
     * on mount, so appending to `editorData` alone would not reach the canvas or
     * Save (both read Puck's store). Bumping the revision remounts Puck with the
     * appended block, keeping the two in agreement: an appended block is both
     * visible on the canvas and persisted by Save.
     */
    queuePendingBlock: (
      state: DashboardEditorAppState,
      block: DashboardEditorPendingBlock,
    ): DashboardEditorAppState => {
      if (
        !state.editorData ||
        state.appendedBlockIds.includes(block.pendingId)
      ) {
        return state;
      }
      return {
        ...state,
        editorData: {
          ...state.editorData,
          content: [...(state.editorData.content ?? []), block.block],
        },
        hasUnsavedChanges: true,
        editorRevision: state.editorRevision + 1,
        appendedBlockIds: [...state.appendedBlockIds, block.pendingId],
      };
    },

    /** Replace the active Puck data after an editor interaction. */
    updateEditorData: (
      state: DashboardEditorAppState,
      editorData: AvaPageData,
    ): DashboardEditorAppState => {
      return { ...state, editorData, hasUnsavedChanges: true };
    },

    /** Mark the current editor data as persisted. */
    markSaved: (state: DashboardEditorAppState): DashboardEditorAppState => {
      return { ...state, hasUnsavedChanges: false };
    },
  },
});
