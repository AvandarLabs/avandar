import assert from "node:assert/strict";
import test from "node:test";
import {
  getThemeBarActions,
  getThemeBarMessage,
  getThemeLabelFromInput,
} from "./themeBarState";

const IDLE = { kind: "idle" } as const;
const QUIET = { isBuiltIn: false, isDirty: true, hasIssues: false };

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
