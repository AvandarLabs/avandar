import assert from "node:assert/strict";
import test from "node:test";
import {
  getThemeBarActions,
  getThemeBarMessage,
  getThemeLabelFromInput,
  submitNewThemeName,
} from "./themeBarState";

const IDLE = { kind: "idle" } as const;
const QUIET = {
  isBuiltIn: false,
  isDirty: true,
  hasIssues: false,
  isChangedOnDisk: false,
};

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
  assert.equal(
    getThemeBarMessage({ ...QUIET, status: { kind: "copied" } }),
    "copied",
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

test("a save refused because the file changed offers Reload theme in the bar", () => {
  assert.equal(
    getThemeBarActions({ ...QUIET, status: _failed(409) }).showsReload,
    true,
  );
});

test("the bar leaves Reload theme to the banner while the banner shows", () => {
  assert.equal(
    getThemeBarActions({
      ...QUIET,
      isChangedOnDisk: true,
      status: _failed(409),
    }).showsReload,
    false,
  );
});

test("other outcomes do not offer Reload theme in the bar", () => {
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
