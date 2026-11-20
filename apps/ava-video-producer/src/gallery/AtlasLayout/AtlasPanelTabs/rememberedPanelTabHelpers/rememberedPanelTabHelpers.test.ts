import assert from "node:assert/strict";
import test from "node:test";
import {
  readRememberedPanelTab,
  rememberPanelTab,
} from "./rememberedPanelTabHelpers";

function _createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => {
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

test("a remembered tokens tab comes back for the same item", () => {
  const storage = _createStorage();
  rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "tokens",
  });
  assert.equal(
    readRememberedPanelTab(storage, "shared-object-handoff"),
    "tokens",
  );
});

test("another item opens on Details", () => {
  const storage = _createStorage();
  rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "tokens",
  });
  assert.equal(readRememberedPanelTab(storage, "qetl-motion"), "details");
});

test("choosing Details forgets the remembered tab", () => {
  const storage = _createStorage();
  rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "tokens",
  });
  rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "details",
  });
  assert.equal(storage.values.size, 0);
  assert.equal(
    readRememberedPanelTab(storage, "shared-object-handoff"),
    "details",
  );
});

test("no storage, a corrupt value, or a throwing storage all read as Details", () => {
  assert.equal(readRememberedPanelTab(undefined, "a"), "details");
  assert.equal(
    readRememberedPanelTab(_createStorage({ "atlas-panel-tab:v1": "{" }), "a"),
    "details",
  );
  assert.equal(
    readRememberedPanelTab(
      _createStorage({
        "atlas-panel-tab:v1": JSON.stringify({ itemId: "a", tab: "other" }),
      }),
      "a",
    ),
    "details",
  );
  const throwing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(readRememberedPanelTab(throwing, "a"), "details");
  assert.doesNotThrow(() => {
    return rememberPanelTab({ storage: throwing, itemId: "a", tab: "tokens" });
  });
});
