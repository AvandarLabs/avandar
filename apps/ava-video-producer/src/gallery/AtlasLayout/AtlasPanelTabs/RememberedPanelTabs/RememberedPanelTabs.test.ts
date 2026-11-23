import assert from "node:assert/strict";
import test from "node:test";
import { RememberedPanelTabs } from "./RememberedPanelTabs";

function _createStorage(initial: Record<string, string> = {}): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> & {
  values: Map<string, string>;
} {
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
  RememberedPanelTabs.rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "tokens",
  });
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage,
      itemId: "shared-object-handoff",
    }),
    "tokens",
  );
});
test("another item opens on Details", () => {
  const storage = _createStorage();
  RememberedPanelTabs.rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "tokens",
  });
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage,
      itemId: "qetl-motion",
    }),
    "details",
  );
});
test("choosing Details forgets the remembered tab", () => {
  const storage = _createStorage();
  RememberedPanelTabs.rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "tokens",
  });
  RememberedPanelTabs.rememberPanelTab({
    storage,
    itemId: "shared-object-handoff",
    tab: "details",
  });
  assert.equal(storage.values.size, 0);
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage,
      itemId: "shared-object-handoff",
    }),
    "details",
  );
});
test("no storage, a corrupt value, or a throwing storage all read as Details", () => {
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage: undefined,
      itemId: "a",
    }),
    "details",
  );
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage: _createStorage({ "atlas-panel-tab:v1": "{" }),
      itemId: "a",
    }),
    "details",
  );
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage: _createStorage({
        "atlas-panel-tab:v1": JSON.stringify({ itemId: "a", tab: "other" }),
      }),
      itemId: "a",
    }),
    "details",
  );
  const throwing = _createThrowingStorage();
  assert.equal(
    RememberedPanelTabs.readRememberedPanelTab({
      storage: throwing,
      itemId: "a",
    }),
    "details",
  );
  assert.doesNotThrow(() => {
    return RememberedPanelTabs.rememberPanelTab({
      storage: throwing,
      itemId: "a",
      tab: "tokens",
    });
  });
});

function _createThrowingStorage(): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> {
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
  return throwing;
}
