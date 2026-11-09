/**
 * The chat's context tray is loaded from localStorage once per identity,
 * saved as it changes, and emptied by a new chat. The app is mounted as in
 * `useAvandarChatRuntime.workspaceSwitch.test.tsx`.
 */
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatContextTrayStore } from "@/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore";
import {
  USER_ID,
  WORKSPACE_A,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  renderAppAt,
  resetHarness,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.harness";
import { harness } from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

const IDENTITY = { workspaceId: WORKSPACE_A.id, userId: USER_ID };
const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "00000000-0000-4000-8000-000000000001",
  subId: null,
};
const MAP_REF: Gadget.Ref = {
  gadgetType: "map",
  gadgetId: "00000000-0000-4000-8000-000000000002",
  subId: null,
};

beforeEach(() => {
  resetHarness();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAvandarChatRuntime context tray", () => {
  it("keeps a stored tray through mount instead of overwriting it", async () => {
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });

    await renderAppAt("/alpha/data-explorer");

    await waitFor(() => {
      expect(harness.chatPanelState?.contextTray).toEqual([DATASET_REF]);
    });
    expect(ChatContextTrayStore.read(IDENTITY)).toEqual([DATASET_REF]);
  });

  it("never writes or clears an empty tray while mounting a stored one", async () => {
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });
    const writeSpy = vi.spyOn(ChatContextTrayStore, "write");
    const clearSpy = vi.spyOn(ChatContextTrayStore, "clear");

    await renderAppAt("/alpha/data-explorer");
    await waitFor(() => {
      expect(harness.chatPanelState?.contextTray).toEqual([DATASET_REF]);
    });

    expect(
      writeSpy.mock.calls.filter(([options]) => {
        return options.refs.length === 0;
      }),
    ).toEqual([]);
    expect(clearSpy).not.toHaveBeenCalled();
    writeSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it("saves refs the user adds", async () => {
    await renderAppAt("/alpha/data-explorer");

    act(() => {
      harness.chatPanelDispatch!.addToContextTray(MAP_REF);
    });

    await waitFor(() => {
      expect(ChatContextTrayStore.read(IDENTITY)).toEqual([MAP_REF]);
    });
  });

  it("empties the tray and the store on a new chat", async () => {
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });
    await renderAppAt("/alpha/data-explorer");
    await waitFor(() => {
      expect(harness.chatPanelState?.contextTray).toEqual([DATASET_REF]);
    });

    act(() => {
      harness.startNewChat!();
    });

    await waitFor(() => {
      expect(harness.chatPanelState?.contextTray).toEqual([]);
    });
    expect(
      window.localStorage.getItem(ChatContextTrayStore.storageKey(IDENTITY)),
    ).toBeNull();
  });
});
