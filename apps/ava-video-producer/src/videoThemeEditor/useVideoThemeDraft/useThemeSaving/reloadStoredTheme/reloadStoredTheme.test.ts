import assert from "node:assert/strict";
import test from "node:test";
import { ThemeApiError } from "../../../ThemeApi/ThemeApiError";
import { createRequestHarness } from "../createRequestHarness";
import { runThemeRequest } from "../runThemeRequest/runThemeRequest";
import { reloadStoredTheme } from "./reloadStoredTheme";
import type { StoredTheme } from "../../../ThemeApi/ThemeApi";

const STORED_THEME = {
  document: { id: "harbor", label: "Harbor" },
  hash: "fresh",
} as unknown as StoredTheme;

function _createReloadOptions(
  overrides: Partial<Parameters<typeof reloadStoredTheme>[0]> = {},
) {
  const harness = createRequestHarness();
  const calls: string[] = [];
  const options = {
    themeId: "harbor",
    inFlight: harness.inFlight,
    read: async () => STORED_THEME,
    storeTheme: () => calls.push("store"),
    rebaseDraft: ({ baseHash }: Readonly<{ baseHash: string }>) =>
      calls.push(`rebase:${baseHash}`),
    setStatus: harness.setStatus,
    ...overrides,
  };
  return { harness, calls, options };
}

test("reloading a theme stores the file, rebases the draft onto its hash, and clears the status", async () => {
  const { harness, calls, options } = _createReloadOptions({
    read: async (id) => {
      assert.equal(id, "harbor");
      return STORED_THEME;
    },
  });
  assert.equal(await reloadStoredTheme(options), true);
  assert.deepEqual(calls, ["store", "rebase:fresh"]);
  assert.deepEqual(harness.statuses, [{ kind: "idle" }]);
  assert.equal(harness.inFlight.current, false);
});

test("a theme that cannot be reloaded reports its status and changes nothing", async () => {
  const { harness, calls, options } = _createReloadOptions({
    read: async () => {
      throw new ThemeApiError(404, "gone", []);
    },
  });
  assert.equal(await reloadStoredTheme(options), false);
  assert.deepEqual(calls, []);
  assert.deepEqual(harness.statuses, [
    { kind: "failed", status: 404, issues: [] },
  ]);
  assert.equal(harness.inFlight.current, false);
});

test("a reload is ignored while a save is in flight, so it cannot overwrite the saved file", async () => {
  const { harness, calls, options } = _createReloadOptions();
  harness.inFlight.current = true;
  let didRead = false;
  const didReload = await reloadStoredTheme({
    ...options,
    read: async () => {
      didRead = true;
      return STORED_THEME;
    },
  });
  assert.equal(didReload, false);
  assert.equal(didRead, false);
  assert.deepEqual(calls, []);
  assert.deepEqual(harness.statuses, []);
});

test("a save is ignored while a reload is in flight", async () => {
  const { harness, options } = _createReloadOptions();
  let finishRead: (stored: StoredTheme) => void = () => {};
  const reloading = reloadStoredTheme({
    ...options,
    read: () => new Promise<StoredTheme>((resolve) => (finishRead = resolve)),
  });
  assert.equal(harness.inFlight.current, true);
  let didSave = false;
  const didRun = await runThemeRequest({
    inFlight: harness.inFlight,
    setStatus: harness.setStatus,
    request: async () => {
      didSave = true;
    },
  });
  assert.equal(didRun, false);
  assert.equal(didSave, false);
  finishRead(STORED_THEME);
  assert.equal(await reloading, true);
  assert.equal(harness.inFlight.current, false);
});
