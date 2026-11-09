import { describe, expect, it } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { act, renderHook } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

function _buildDatasetRef(index: number): Gadget.Ref {
  return {
    gadgetType: "dataset",
    gadgetId: `00000000-0000-4000-8000-00000000000${index}`,
    subId: null,
  };
}

function _renderTrayHook() {
  return renderHook(
    () => {
      return {
        state: ChatPanelStateManager.useState(),
        dispatch: ChatPanelStateManager.useDispatch(),
      };
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <ChatPanelStateManager.Provider>
            {children}
          </ChatPanelStateManager.Provider>
        );
      },
    },
  );
}

describe("ChatPanelStateManager context tray", () => {
  it("starts empty", () => {
    const { result } = _renderTrayHook();

    expect(result.current.state.contextTray).toEqual([]);
  });

  it("adds a ref once", () => {
    const { result } = _renderTrayHook();

    act(() => {
      result.current.dispatch.addToContextTray(_buildDatasetRef(1));
      result.current.dispatch.addToContextTray(_buildDatasetRef(1));
    });

    expect(result.current.state.contextTray).toEqual([_buildDatasetRef(1)]);
  });

  it("adds at most five refs", () => {
    const { result } = _renderTrayHook();

    act(() => {
      [1, 2, 3, 4, 5, 6, 7].forEach((index) => {
        result.current.dispatch.addToContextTray(_buildDatasetRef(index));
      });
    });

    expect(result.current.state.contextTray).toEqual(
      [1, 2, 3, 4, 5].map(_buildDatasetRef),
    );
  });

  it("removes a ref", () => {
    const { result } = _renderTrayHook();
    act(() => {
      result.current.dispatch.addToContextTray(_buildDatasetRef(1));
      result.current.dispatch.addToContextTray(_buildDatasetRef(2));
    });

    act(() => {
      result.current.dispatch.removeFromContextTray(_buildDatasetRef(1));
    });

    expect(result.current.state.contextTray).toEqual([_buildDatasetRef(2)]);
  });

  it("replaces the tray", () => {
    const { result } = _renderTrayHook();

    act(() => {
      result.current.dispatch.setContextTray([_buildDatasetRef(3)]);
    });

    expect(result.current.state.contextTray).toEqual([_buildDatasetRef(3)]);
  });
});
