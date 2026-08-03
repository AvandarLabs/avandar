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
    const block = {
      type: "Text",
      props: { id: "generated-block" },
    } as unknown as AvaPageData["content"][number];

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
});
