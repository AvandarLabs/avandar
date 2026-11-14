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

function createReloadOptions(
  overrides: Partial<Parameters<typeof reloadStoredTheme>[0]> = {},
) {
  const harness = createHarness();
  const calls: string[] = [];
  const options = {
    themeId: "harbor",
    inFlight: harness.inFlight,
    read: async () => STORED_THEME,
    storeTheme: () => calls.push("store"),
    rebaseDraft: (hash: string) => calls.push(`rebase:${hash}`),
    setStatus: harness.setStatus,
    ...overrides,
  };
  return { harness, calls, options };
}

test("reloading a theme stores the file, rebases the draft onto its hash, and clears the status", async () => {
  const { harness, calls, options } = createReloadOptions({
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
  const { harness, calls, options } = createReloadOptions({
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
  const { harness, calls, options } = createReloadOptions();
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
  const { harness, options } = createReloadOptions();
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

test("a request that throws a plain error ends in a failed status with code 0", async () => {
  const harness = createHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    request: async () => {
      throw new Error("base theme missing");
    },
  });
  assert.equal(didSucceed, false);
  assert.deepEqual(harness.statuses.at(-1), {
    kind: "failed",
    status: 0,
    issues: [],
  });
});

test("a request marked as a create reports its failure as a create failure", async () => {
  const harness = createHarness();
  const didSucceed = await runThemeRequest({
    ...harness,
    failureKind: "createFailed",
    request: async () => {
      throw new ThemeApiError(409, "exists", []);
    },
  });
  assert.equal(didSucceed, false);
  assert.deepEqual(harness.statuses.at(-1), {
    kind: "createFailed",
    status: 409,
    issues: [],
  });
});
