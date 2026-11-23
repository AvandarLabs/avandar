/** Behavioral tests for the chat context tray's localStorage slot. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatContextTrayStore } from "./ChatContextTrayStore";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

const IDENTITY = { workspaceId: "ws-1", userId: "user-1" };

function _buildDatasetRef(index: number): Gadget.Ref {
  return {
    gadgetType: "dataset",
    gadgetId: `00000000-0000-4000-8000-00000000000${index}`,
    subId: null,
  };
}

const DATASET_REF = _buildDatasetRef(1);
const CASE_REF: Gadget.Ref = {
  gadgetType: "individual",
  gadgetId: "00000000-0000-4000-8000-0000000000aa",
  subId: null,
};
const SIX_DATASET_REFS = [1, 2, 3, 4, 5, 6].map(_buildDatasetRef);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("ChatContextTrayStore", () => {
  it("round-trips refs per workspace and user", () => {
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });

    expect(ChatContextTrayStore.read(IDENTITY)).toEqual([DATASET_REF]);
    expect(ChatContextTrayStore.read({ ...IDENTITY, userId: "u2" })).toEqual(
      [],
    );
    expect(
      ChatContextTrayStore.read({ ...IDENTITY, workspaceId: "ws-2" }),
    ).toEqual([]);
  });

  it("drops cases, malformed refs, and anything past five", () => {
    window.localStorage.setItem(
      ChatContextTrayStore.storageKey(IDENTITY),
      JSON.stringify({
        refs: [CASE_REF, { gadgetType: "dataset" }, ...SIX_DATASET_REFS],
      }),
    );

    expect(ChatContextTrayStore.read(IDENTITY)).toEqual(
      SIX_DATASET_REFS.slice(0, 5),
    );
  });

  it("returns nothing for corrupt JSON", () => {
    window.localStorage.setItem(
      ChatContextTrayStore.storageKey(IDENTITY),
      "{not json",
    );

    expect(ChatContextTrayStore.read(IDENTITY)).toEqual([]);
  });

  it("stores refs only, even when a caller passes extra fields", () => {
    const refWithName = { ...DATASET_REF, name: "Secret name" };

    ChatContextTrayStore.write({ ...IDENTITY, refs: [refWithName] });

    const raw = window.localStorage.getItem(
      ChatContextTrayStore.storageKey(IDENTITY),
    );
    expect(JSON.parse(raw ?? "")).toEqual({ refs: [DATASET_REF] });
  });

  it("clears the stored tray", () => {
    ChatContextTrayStore.write({ ...IDENTITY, refs: [DATASET_REF] });

    ChatContextTrayStore.clear(IDENTITY);

    expect(ChatContextTrayStore.read(IDENTITY)).toEqual([]);
    expect(
      window.localStorage.getItem(ChatContextTrayStore.storageKey(IDENTITY)),
    ).toBeNull();
  });

  it("does nothing without a workspace or user", () => {
    ChatContextTrayStore.write({
      workspaceId: "",
      userId: "user-1",
      refs: [DATASET_REF],
    });

    expect(window.localStorage.length).toBe(0);
    expect(ChatContextTrayStore.read({ workspaceId: "", userId: "u" })).toEqual(
      [],
    );
  });
});
