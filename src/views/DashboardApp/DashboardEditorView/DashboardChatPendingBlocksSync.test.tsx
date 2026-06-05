import { render, waitFor } from "@/test-utils";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DashboardChatPendingBlocksSync } from "@/views/DashboardApp/DashboardEditorView/DashboardChatPendingBlocksSync";

const dispatchMock = vi.fn();

vi.mock("@/views/DashboardApp/DashboardEditorView/useDashboardPuck", () => {
  return {
    useDashboardPuck: (
      selector: (store: { dispatch: typeof dispatchMock }) => unknown,
    ) => {
      return selector({ dispatch: dispatchMock });
    },
  };
});

describe("DashboardChatPendingBlocksSync", () => {
  it("dispatches setData when pending blocks are queued", async () => {
    dispatchMock.mockClear();

    function TestHarness(): null {
      const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();
      useEffect(() => {
        dashboardEditorDispatch.queuePendingBlock({
          pendingId: "pending-1",
          block: {
            type: "HeadingBlock",
            props: {
              id: "HeadingBlock-test",
              text: "From chat",
              level: 2,
              align: "left",
            },
          },
        });
      }, [dashboardEditorDispatch]);
      return null;
    }

    render(
      <DashboardEditorStateManager.Provider>
        <TestHarness />
        <DashboardChatPendingBlocksSync />
      </DashboardEditorStateManager.Provider>,
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: "setData" }),
      );
    });

    const setDataCall = dispatchMock.mock.calls[0]![0] as {
      type: string;
      data: (previous: { content: unknown[] }) => { content: unknown[] };
    };
    const next = setDataCall.data({ content: [] });
    expect(next.content).toHaveLength(1);
    expect(next.content[0]).toMatchObject({
      type: "HeadingBlock",
      props: expect.objectContaining({ text: "From chat" }),
    });
  });
});
