import assert from "node:assert/strict";
import test from "node:test";
import { ThemeApiError, type StoredTheme } from "../ThemeApi/ThemeApi";
import {
  reloadStoredTheme,
  runThemeRequest,
  type ThemeSaveStatus,
} from "./useThemeSaving";

function createHarness() {
  const statuses: ThemeSaveStatus[] = [];
  return {
    statuses,
    inFlight: { current: false },
    setStatus: (status: ThemeSaveStatus) => statuses.push(status),
  };
}

test("a request that succeeds resolves true and ends saved", async () => {
  const harness = createHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {},
  });
  assert.equal(didSucceed, true);
  assert.deepEqual(
    harness.statuses.map((status) => status.kind),
    ["saving", "saved"],
  );
  assert.equal(harness.inFlight.current, false);
});

test("a request the server refuses resolves false and reports its status", async () => {
  const harness = createHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {
      throw new ThemeApiError(409, "exists", []);
    },
  });
  assert.equal(didSucceed, false);
  assert.deepEqual(harness.statuses.at(-1), {
    kind: "failed",
    status: 409,
    issues: [],
  });
  assert.equal(harness.inFlight.current, false);
});

test("a request started while another is in flight resolves false", async () => {
  const harness = createHarness();
  harness.inFlight.current = true;
  let didRun = false;
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {
      didRun = true;
    },
  });
  assert.equal(didSucceed, false);
  assert.equal(didRun, false);
  assert.deepEqual(harness.statuses, []);
});

const STORED_THEME = {
  document: { id: "harbor", label: "Harbor" },
  hash: "fresh",
} as unknown as StoredTheme;

test("reloading a theme stores the file's current contents and clears the status", async () => {
  const harness = createHarness();
  const stored: StoredTheme[] = [];
  const didReload = await reloadStoredTheme({
    themeId: "harbor",
    read: async (id) => {
      assert.equal(id, "harbor");
      return STORED_THEME;
    },
    storeTheme: (theme) => stored.push(theme),
    setStatus: harness.setStatus,
  });
  assert.equal(didReload, true);
  assert.deepEqual(stored, [STORED_THEME]);
  assert.deepEqual(harness.statuses, [{ kind: "idle" }]);
});

test("a theme that cannot be reloaded reports its status and stores nothing", async () => {
  const harness = createHarness();
  const stored: StoredTheme[] = [];
  const didReload = await reloadStoredTheme({
    themeId: "harbor",
    read: async () => {
      throw new ThemeApiError(404, "gone", []);
    },
    storeTheme: (theme) => stored.push(theme),
    setStatus: harness.setStatus,
  });
  assert.equal(didReload, false);
  assert.deepEqual(stored, []);
  assert.deepEqual(harness.statuses, [
    { kind: "failed", status: 404, issues: [] },
  ]);
});
