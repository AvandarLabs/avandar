import assert from "node:assert/strict";
import test from "node:test";
import {
  createSavedDocumentFromDraft,
  EMPTY_THEME_DRAFT,
  isThemeDraftEmpty,
  setTokenInDraft,
  type ThemeDraft,
} from "../../themeDraft/themeDraft";
import {
  createDraftAfterSave,
  createEditedRecord,
  createKeptRecord,
  createRebasedRecord,
  createDiscardedRecord,
  getLatestDraftOfTheme,
  isDraftUnchanged,
  isRecordChangedOnDisk,
  type DraftRecord,
} from "./storedDraftRecord";
import type { VideoThemeDocument } from "../../../videoTheme/videoTheme.types";

const THEME = { kind: "theme" } as const;
const ACCENT_DRAFT = setTokenInDraft({
  draft: EMPTY_THEME_DRAFT,
  scope: THEME,
  tokenPath: "color.accent",
  value: "$atomic.swatch.cyan",
});
const MORE_DRAFT = setTokenInDraft({
  draft: ACCENT_DRAFT,
  scope: THEME,
  tokenPath: "color.text",
  value: "$atomic.swatch.mint",
});

test("the first edit is stored against the file as it is now", () => {
  const record = createEditedRecord({
    previousHash: undefined,
    hadEdits: false,
    fileHash: "H1",
    draft: ACCENT_DRAFT,
  });
  assert.deepEqual(record, { baseHash: "H1", draft: ACCENT_DRAFT });
});

test("a later edit keeps the hash the draft started from", () => {
  const record = createEditedRecord({
    previousHash: "H1",
    hadEdits: true,
    fileHash: "H2",
    draft: MORE_DRAFT,
  });
  assert.equal(record.baseHash, "H1");
  assert.equal(isRecordChangedOnDisk({ record, fileHash: "H2" }), true);
});

test("after a save and discard the next edit is against the saved file, so no banner shows", () => {
  const discarded = createDiscardedRecord("H1");
  const edited = createEditedRecord({
    previousHash: discarded.baseHash,
    hadEdits: !isThemeDraftEmpty(discarded.draft),
    fileHash: "H2",
    draft: ACCENT_DRAFT,
  });
  assert.equal(edited.baseHash, "H2");
  assert.equal(
    isRecordChangedOnDisk({ record: edited, fileHash: "H2" }),
    false,
  );
});

test("an empty draft with a stale hash does not outlive a file change", () => {
  const edited = createEditedRecord({
    previousHash: "H1",
    hadEdits: false,
    fileHash: "H2",
    draft: ACCENT_DRAFT,
  });
  assert.equal(edited.baseHash, "H2");
});

test("an edit before the theme file is known keeps the record's hash", () => {
  const edited = createEditedRecord({
    previousHash: "H1",
    hadEdits: false,
    fileHash: "",
    draft: ACCENT_DRAFT,
  });
  assert.equal(edited.baseHash, "H1");
});

test("keeping the draft moves it onto the current file", () => {
  assert.deepEqual(createKeptRecord({ fileHash: "H2", draft: ACCENT_DRAFT }), {
    baseHash: "H2",
    draft: ACCENT_DRAFT,
  });
});

test("rebasing records the draft against the given hash", () => {
  assert.deepEqual(
    createRebasedRecord({ baseHash: "H3", draft: ACCENT_DRAFT }),
    { baseHash: "H3", draft: ACCENT_DRAFT },
  );
});

test("discarding drops the edits and records the current file", () => {
  assert.deepEqual(createDiscardedRecord("H2"), {
    baseHash: "H2",
    draft: EMPTY_THEME_DRAFT,
  });
});

test("changed on disk needs edits and two differing hashes", () => {
  const withEdits: DraftRecord = { baseHash: "H1", draft: ACCENT_DRAFT };
  const empty: DraftRecord = { baseHash: "H1", draft: EMPTY_THEME_DRAFT };
  assert.equal(
    isRecordChangedOnDisk({ record: withEdits, fileHash: "H2" }),
    true,
  );
  assert.equal(
    isRecordChangedOnDisk({ record: withEdits, fileHash: "H1" }),
    false,
  );
  assert.equal(
    isRecordChangedOnDisk({ record: withEdits, fileHash: "" }),
    false,
  );
  assert.equal(isRecordChangedOnDisk({ record: empty, fileHash: "H2" }), false);
  assert.equal(
    isRecordChangedOnDisk({ record: undefined, fileHash: "H2" }),
    false,
  );
});

const SAVED_BASE: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
};
const ITEM = { kind: "item", itemId: "network-graph" } as const;

function _settle(
  savedDraft: ThemeDraft,
  currentDraft: ThemeDraft,
  otherDrafts: ReadonlyMap<string, ThemeDraft> = new Map(),
) {
  return createDraftAfterSave({
    themeId: "studio",
    savedDraft,
    latestDrafts: new Map([...otherDrafts, ["studio", currentDraft]]),
    savedDocument: createSavedDocumentFromDraft(SAVED_BASE, savedDraft),
  });
}

test("a draft unchanged since the save started is cleared", () => {
  assert.deepEqual(_settle(ACCENT_DRAFT, ACCENT_DRAFT), EMPTY_THEME_DRAFT);
});

test("an equal copy of the saved draft is cleared too", () => {
  const copy: ThemeDraft = structuredClone(ACCENT_DRAFT);
  assert.deepEqual(_settle(ACCENT_DRAFT, copy), EMPTY_THEME_DRAFT);
});

test("an edit made during the save is kept, and the saved values are folded in", () => {
  assert.deepEqual(
    _settle(ACCENT_DRAFT, MORE_DRAFT),
    setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "color.text",
      value: "$atomic.swatch.mint",
    }),
  );
});

test("a saved token edited again during the save keeps its newer value", () => {
  const newer = setTokenInDraft({
    draft: ACCENT_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.orange",
  });
  assert.deepEqual(
    _settle(ACCENT_DRAFT, newer),
    setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "color.accent",
      value: "$atomic.swatch.orange",
    }),
  );
});

test("item edits are folded in against the saved item overrides", () => {
  const saved = setTokenInDraft({
    draft: ACCENT_DRAFT,
    scope: ITEM,
    tokenPath: "color.accent",
    value: "$atomic.swatch.mint",
  });
  const newer = setTokenInDraft({
    draft: saved,
    scope: ITEM,
    tokenPath: "color.text",
    value: "$atomic.swatch.cyan",
  });
  assert.deepEqual(
    _settle(saved, newer),
    setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: ITEM,
      tokenPath: "color.text",
      value: "$atomic.swatch.cyan",
    }),
  );
});

test("a newer draft that lacks a saved token keeps only its own edits", () => {
  const unrelated = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.text",
    value: "$atomic.swatch.mint",
  });
  const result = _settle(ACCENT_DRAFT, unrelated);
  assert.deepEqual(result, unrelated);
});

test("drafts are unchanged only when every edit matches", () => {
  const copy: ThemeDraft = structuredClone(ACCENT_DRAFT);
  assert.equal(
    isDraftUnchanged({ savedDraft: ACCENT_DRAFT, currentDraft: copy }),
    true,
  );
  assert.equal(
    isDraftUnchanged({ savedDraft: ACCENT_DRAFT, currentDraft: MORE_DRAFT }),
    false,
  );
  assert.equal(
    isDraftUnchanged({
      savedDraft: EMPTY_THEME_DRAFT,
      currentDraft: ACCENT_DRAFT,
    }),
    false,
  );
});

test("switching to another theme during a save does not copy its draft into the saved theme", () => {
  const otherThemeDraft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.text",
    value: "$atomic.swatch.orange",
  });
  const result = createDraftAfterSave({
    themeId: "studio",
    savedDraft: ACCENT_DRAFT,
    latestDrafts: new Map([
      ["studio", ACCENT_DRAFT],
      ["other", otherThemeDraft],
    ]),
    savedDocument: createSavedDocumentFromDraft(SAVED_BASE, ACCENT_DRAFT),
  });
  assert.deepEqual(result, EMPTY_THEME_DRAFT);
});

test("edits made to the saved theme before switching away during a save are kept", () => {
  const otherThemeDraft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.text",
    value: "$atomic.swatch.orange",
  });
  assert.deepEqual(
    _settle(ACCENT_DRAFT, MORE_DRAFT, new Map([["other", otherThemeDraft]])),
    setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "color.text",
      value: "$atomic.swatch.mint",
    }),
  );
});

test("a theme with no latest draft on record is treated as unchanged since the save", () => {
  const result = createDraftAfterSave({
    themeId: "studio",
    savedDraft: ACCENT_DRAFT,
    latestDrafts: new Map(),
    savedDocument: createSavedDocumentFromDraft(SAVED_BASE, ACCENT_DRAFT),
  });
  assert.deepEqual(result, EMPTY_THEME_DRAFT);
});

test("the latest draft of a theme is read by its id, falling back to the given draft", () => {
  const latestDrafts = new Map([["studio", MORE_DRAFT]]);
  assert.equal(
    getLatestDraftOfTheme({
      latestDrafts,
      themeId: "studio",
      fallback: ACCENT_DRAFT,
    }),
    MORE_DRAFT,
  );
  assert.equal(
    getLatestDraftOfTheme({
      latestDrafts,
      themeId: "other",
      fallback: ACCENT_DRAFT,
    }),
    ACCENT_DRAFT,
  );
});

test("a token reset during the save is dropped, because a draft cannot remove a saved token", () => {
  const savedBoth = MORE_DRAFT;
  const resetText = ACCENT_DRAFT;
  assert.deepEqual(_settle(savedBoth, resetText), EMPTY_THEME_DRAFT);
});
