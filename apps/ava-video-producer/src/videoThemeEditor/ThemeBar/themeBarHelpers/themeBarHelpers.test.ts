import assert from "node:assert/strict";
import test from "node:test";
import {
  getThemeBarActions,
  getThemeBarMessage,
  getThemeLabelFromInput,
  reloadThenFocus,
  submitNewThemeName,
} from "./themeBarHelpers";

const IDLE = { kind: "idle" } as const;
const QUIET = {
  isBuiltIn: false,
  isDirty: true,
  hasIssues: false,
  isChangedOnDisk: false,
  copyStatus: "idle",
} as const;

function _failed(status: number) {
  return { kind: "failed", status, issues: [] } as const;
}

test("each finished theme action has its own status message", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: { kind: "saving" } }),
    "saving",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: { kind: "saved" } }),
    "saved",
  );
});

test("a finished copy has its own message", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: IDLE, copyStatus: "copied" }),
    "copied",
  );
});

test("a copy that failed says the copy failed, not that the save did", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: IDLE, copyStatus: "failed" }),
    "copyFailed",
  );
});

test("a copy finishing during a save does not hide the save or unlock its actions", () => {
  const input = {
    ...QUIET,
    status: { kind: "saving" },
    copyStatus: "copied",
  } as const;
  assert.equal(getThemeBarMessage(input), "saving");
  const actions = getThemeBarActions(input);
  assert.deepEqual(
    [actions.canSave, actions.canSaveAsNew, actions.canDiscard],
    [false, false, false],
  );
});

test("a refused save is explained by its HTTP status", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _failed(400) }),
    "invalidTheme",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _failed(403) }),
    "readOnlyTheme",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _failed(409) }),
    "changedOnDisk",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _failed(413) }),
    "themeTooLarge",
  );
});

test("a conflict shown by the changed-on-disk banner points at its actions, not a reload", () => {
  assert.equal(
    getThemeBarMessage({
      ...QUIET,
      isChangedOnDisk: true,
      status: _failed(409),
    }),
    "changedOnDiskUseBanner",
  );
});

test("a save that failed for any other reason gets the generic message", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _failed(500) }),
    "saveFailed",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _failed(0) }),
    "saveFailed",
  );
});

test("a save refused with token issues points at the marked tokens", () => {
  const status = {
    kind: "failed",
    status: 422,
    issues: [{ path: "color.accent", message: "bad" }],
  } as const;
  assert.equal(getThemeBarMessage({ ...QUIET, status }), "invalidTheme");
});

test("while idle, the status line says why saving is unavailable", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, hasIssues: true, status: IDLE }),
    "fixIssuesFirst",
  );
  assert.equal(getThemeBarMessage({ ...QUIET, status: IDLE }), "none");
});

test("save needs unsaved, valid changes to a custom theme", () => {
  assert.equal(getThemeBarActions({ ...QUIET, status: IDLE }).canSave, true);
  assert.equal(
    getThemeBarActions({ ...QUIET, isDirty: false, status: IDLE }).canSave,
    false,
  );
  assert.equal(
    getThemeBarActions({ ...QUIET, hasIssues: true, status: IDLE }).canSave,
    false,
  );
  assert.equal(
    getThemeBarActions({ ...QUIET, isBuiltIn: true, status: IDLE }).showsSave,
    false,
  );
});

test("no theme action can start while a save is in flight", () => {
  const actions = getThemeBarActions({ ...QUIET, status: { kind: "saving" } });
  assert.deepEqual(
    [actions.canSave, actions.canSaveAsNew, actions.canDiscard],
    [false, false, false],
  );
});

test("a theme without issues can always be saved as a new theme", () => {
  const clean = { ...QUIET, isDirty: false, status: IDLE };
  assert.equal(getThemeBarActions(clean).canSaveAsNew, true);
  assert.equal(getThemeBarActions(clean).canDiscard, false);
  assert.equal(
    getThemeBarActions({ ...clean, hasIssues: true }).canSaveAsNew,
    false,
  );
});

test("a new theme name is trimmed, and a blank name is no name", () => {
  assert.equal(getThemeLabelFromInput("  Night shift "), "Night shift");
  assert.equal(getThemeLabelFromInput("   "), undefined);
});

test("a save refused because the file changed offers Reload from file in the bar", () => {
  assert.equal(
    getThemeBarActions({ ...QUIET, status: _failed(409) }).showsReload,
    true,
  );
});

test("the bar leaves Reload from file to the banner while the banner shows", () => {
  assert.equal(
    getThemeBarActions({
      ...QUIET,
      isChangedOnDisk: true,
      status: _failed(409),
    }).showsReload,
    false,
  );
});

test("other outcomes do not offer Reload from file in the bar", () => {
  assert.equal(
    getThemeBarActions({ ...QUIET, status: _failed(500) }).showsReload,
    false,
  );
  assert.equal(
    getThemeBarActions({ ...QUIET, status: IDLE }).showsReload,
    false,
  );
});

test("the name form closes only once the theme was created", async () => {
  let closeCount = 0;
  await submitNewThemeName({
    label: "Night shift",
    saveAsNew: async (label) => {
      assert.equal(label, "Night shift");
      return true;
    },
    close: () => closeCount++,
  });
  assert.equal(closeCount, 1);
});

test("the name form stays open, keeping the typed name, when the save fails", async () => {
  let closeCount = 0;
  await submitNewThemeName({
    label: "Night shift",
    saveAsNew: async () => false,
    close: () => closeCount++,
  });
  assert.equal(closeCount, 0);
});

test("Save waits while the changed-on-disk banner asks for a decision", () => {
  const waiting = getThemeBarActions({
    ...QUIET,
    status: IDLE,
    isChangedOnDisk: true,
  });
  assert.equal(waiting.showsSave, true);
  assert.equal(waiting.canSave, false);
  assert.equal(waiting.canSaveAsNew, true);
  assert.equal(waiting.canDiscard, true);
});

test("Save is available again once the banner is answered", () => {
  assert.equal(
    getThemeBarActions({ ...QUIET, status: IDLE, isChangedOnDisk: false })
      .canSave,
    true,
  );
});

test("while the banner waits, the status line points at it before any token problem", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: IDLE, isChangedOnDisk: true }),
    "changedOnDiskUseBanner",
  );
  assert.equal(
    getThemeBarMessage({
      ...QUIET,
      status: IDLE,
      isChangedOnDisk: true,
      hasIssues: true,
    }),
    "changedOnDiskUseBanner",
  );
});

function _createFailed(status: number) {
  return { kind: "createFailed", status, issues: [] } as const;
}

test("a new theme refused because its name is taken says so, not that the file changed", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _createFailed(409) }),
    "themeNameTaken",
  );
  assert.equal(
    getThemeBarMessage({
      ...QUIET,
      isChangedOnDisk: true,
      status: _createFailed(409),
    }),
    "themeNameTaken",
  );
});

test("a name clash offers no Reload from file", () => {
  assert.equal(
    getThemeBarActions({ ...QUIET, status: _createFailed(409) }).showsReload,
    false,
  );
});

test("a new theme refused for another reason is explained like a refused save", () => {
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _createFailed(400) }),
    "invalidTheme",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _createFailed(413) }),
    "themeTooLarge",
  );
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: _createFailed(0) }),
    "saveFailed",
  );
});

test("a copy after a refused save keeps Reload from file in the bar", () => {
  assert.equal(
    getThemeBarActions({
      ...QUIET,
      status: _failed(409),
      copyStatus: "copied",
    }).showsReload,
    true,
  );
});

test("focus moves to the theme bar once a reload succeeded, because the button that asked is gone", async () => {
  const calls: string[] = [];
  await reloadThenFocus({
    reload: async () => true,
    focus: () => calls.push("focus"),
  });
  assert.deepEqual(calls, ["focus"]);
});

test("focus stays where it is when the reload failed, so the button stays usable", async () => {
  const calls: string[] = [];
  await reloadThenFocus({
    reload: async () => false,
    focus: () => calls.push("focus"),
  });
  assert.deepEqual(calls, []);
});

test("the theme picker is locked while a save is in flight, so a switch cannot cross the save", () => {
  assert.equal(
    getThemeBarActions({ ...QUIET, status: { kind: "saving" } }).canSwitchTheme,
    false,
  );
  assert.equal(
    getThemeBarActions({ ...QUIET, status: IDLE }).canSwitchTheme,
    true,
  );
});
