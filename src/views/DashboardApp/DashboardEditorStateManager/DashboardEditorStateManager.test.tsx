import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactNode } from "react";

function createEditorData(): AvaPageData {
  return {
    root: { props: {} },
    content: [],
  } as unknown as AvaPageData;
}

function createBlock(id: string): AvaPageData["content"][number] {
  return {
    type: "Text",
    props: { id },
  } as unknown as AvaPageData["content"][number];
}

function renderManagerHooks() {
  return renderHook(
    () => {
      return {
        state: DashboardEditorStateManager.useState(),
        dispatch: DashboardEditorStateManager.useDispatch(),
      };
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <DashboardEditorStateManager.Provider>
            {children}
          </DashboardEditorStateManager.Provider>
        );
      },
    },
  );
}

describe("DashboardEditorStateManager", () => {
  it("appends each generated block once and remounts Puck via the revision", () => {
    const { result } = renderManagerHooks();
    const block = createBlock("generated-block");

    act(() => {
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-id",
        editorData: createEditorData(),
      });
      result.current.dispatch.queuePendingBlock({
        block,
        pendingId: "pending-id",
      });
      result.current.dispatch.queuePendingBlock({
        block,
        pendingId: "pending-id",
      });
    });

    expect(result.current.state.editorData?.content).toEqual([block]);
    expect(result.current.state.hasUnsavedChanges).toBe(true);
    expect(result.current.state.appendedBlockIds).toEqual(["pending-id"]);
    // setActiveDashboard bumps to 1; the first append bumps to 2; the deduped
    // second append does not bump. The bump is what remounts Puck so the
    // appended block reaches the canvas and Save.
    expect(result.current.state.editorRevision).toBe(2);
  });

  it("buffers a block queued before the editor registers and flushes it on setActiveDashboard", () => {
    const { result } = renderManagerHooks();
    const block = createBlock("chat-block");

    // Chat responds before the editor mounts: editorData is still undefined.
    act(() => {
      result.current.dispatch.queuePendingBlock({
        block,
        pendingId: "pending-id",
        dashboardId: "dashboard-id",
      });
    });

    // The block is buffered, not dropped, and the canvas is untouched so far.
    expect(result.current.state.editorData).toBeUndefined();
    expect(result.current.state.pendingBlocks).toHaveLength(1);

    // The editor finishes mounting and registers itself.
    act(() => {
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-id",
        editorData: createEditorData(),
      });
    });

    // The buffered block is flushed onto the content.
    expect(result.current.state.editorData?.content).toEqual([block]);
    expect(result.current.state.appendedBlockIds).toEqual(["pending-id"]);
    expect(result.current.state.hasUnsavedChanges).toBe(true);
  });

  it("re-flushes a buffered block across a StrictMode-style unmount/remount", () => {
    const { result } = renderManagerHooks();
    const block = createBlock("chat-block");

    act(() => {
      result.current.dispatch.queuePendingBlock({
        block,
        pendingId: "pending-id",
        dashboardId: "dashboard-id",
      });
      // StrictMode dev cycle: mount → cleanup → mount.
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-id",
        editorData: createEditorData(),
      });
      result.current.dispatch.setActiveDashboard(undefined);
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-id",
        editorData: createEditorData(),
      });
    });

    // The block survives the cleanup and lands on the final mount's content.
    expect(result.current.state.editorData?.content).toEqual([block]);
    expect(result.current.state.appendedBlockIds).toEqual(["pending-id"]);
  });

  it("drops a buffered block that targets a different dashboard", () => {
    const { result } = renderManagerHooks();
    const block = createBlock("chat-block");

    act(() => {
      result.current.dispatch.queuePendingBlock({
        block,
        pendingId: "pending-id",
        dashboardId: "dashboard-a",
      });
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-b",
        editorData: createEditorData(),
      });
    });

    expect(result.current.state.editorData?.content).toEqual([]);
    expect(result.current.state.pendingBlocks).toHaveLength(0);
  });

  it("absorbs a buffered block once it appears in editor data so it does not resurrect", () => {
    const { result } = renderManagerHooks();
    const block = createBlock("chat-block");

    act(() => {
      result.current.dispatch.queuePendingBlock({
        block,
        pendingId: "pending-id",
        dashboardId: "dashboard-id",
      });
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-id",
        editorData: createEditorData(),
      });
    });
    expect(result.current.state.pendingBlocks).toHaveLength(1);

    // Puck echoes the content back (it now owns the block).
    act(() => {
      result.current.dispatch.updateEditorData({
        root: { props: {} },
        content: [block],
      } as unknown as AvaPageData);
    });
    expect(result.current.state.pendingBlocks).toHaveLength(0);

    // The user deletes the block; it must stay gone on a later remount.
    act(() => {
      result.current.dispatch.updateEditorData(createEditorData());
      result.current.dispatch.setActiveDashboard(undefined);
      result.current.dispatch.setActiveDashboard({
        dashboardId: "dashboard-id",
        editorData: createEditorData(),
      });
    });
    expect(result.current.state.editorData?.content).toEqual([]);
  });
});
