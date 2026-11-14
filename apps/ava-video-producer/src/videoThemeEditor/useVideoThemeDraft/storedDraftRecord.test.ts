import assert from "node:assert/strict";
import test from "node:test";
import {
  createSavedDocumentFromDraft,
  EMPTY_THEME_DRAFT,
  isThemeDraftEmpty,
  setTokenInDraft,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import {
  createDraftAfterSave,
  createEditedRecord,
  createKeptRecord,
  createRebasedRecord,
  createDiscardedRecord,
  isDraftUnchanged,
  isRecordChangedOnDisk,
  type DraftRecord,
} from "./storedDraftRecord";
import type { VideoThemeDocument } from "../../videoTheme/videoTheme.types";

const THEME = { kind: "theme" } as const;
const ACCENT_DRAFT = setTokenInDraft(
  EMPTY_THEME_DRAFT,
  THEME,
  "color.accent",
  "$atomic.swatch.cyan",
);
const MORE_DRAFT = setTokenInDraft(
  ACCENT_DRAFT,
  THEME,
  "color.text",
  "$atomic.swatch.mint",
);

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

function _settle(savedDraft: ThemeDraft, currentDraft: ThemeDraft) {
  return createDraftAfterSave({
    savedDraft,
    currentDraft,
    savedDocument: createSavedDocumentFromDraft(SAVED_BASE, savedDraft),
  });
}

test("a draft unchanged since the save started is cleared", () => {
  assert.deepEqual(_settle(ACCENT_DRAFT, ACCENT_DRAFT), EMPTY_THEME_DRAFT);
});

test("an equal copy of the saved draft is cleared too", () => {
  const copy: ThemeDraft = JSON.parse(JSON.stringify(ACCENT_DRAFT));
  assert.deepEqual(_settle(ACCENT_DRAFT, copy), EMPTY_THEME_DRAFT);
});

test("an edit made during the save is kept, and the saved values are folded in", () => {
  assert.deepEqual(
    _settle(ACCENT_DRAFT, MORE_DRAFT),
    setTokenInDraft(
      EMPTY_THEME_DRAFT,
      THEME,
      "color.text",
      "$atomic.swatch.mint",
    ),
  );
});

test("a saved token edited again during the save keeps its newer value", () => {
  const newer = setTokenInDraft(
    ACCENT_DRAFT,
    THEME,
    "color.accent",
    "$atomic.swatch.orange",
  );
  assert.deepEqual(
    _settle(ACCENT_DRAFT, newer),
    setTokenInDraft(
      EMPTY_THEME_DRAFT,
      THEME,
      "color.accent",
      "$atomic.swatch.orange",
    ),
  );
});

test("item edits are folded in against the saved item overrides", () => {
  const saved = setTokenInDraft(
    ACCENT_DRAFT,
    ITEM,
    "color.accent",
    "$atomic.swatch.mint",
  );
  const newer = setTokenInDraft(
    saved,
    ITEM,
    "color.text",
    "$atomic.swatch.cyan",
  );
  assert.deepEqual(
    _settle(saved, newer),
    setTokenInDraft(
      EMPTY_THEME_DRAFT,
      ITEM,
      "color.text",
      "$atomic.swatch.cyan",
    ),
  );
});

test("a newer draft that lacks a saved token keeps only its own edits", () => {
  const unrelated = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.text",
    "$atomic.swatch.mint",
  );
  const result = _settle(ACCENT_DRAFT, unrelated);
  assert.deepEqual(result, unrelated);
});

test("drafts are unchanged only when every edit matches", () => {
  const copy: ThemeDraft = JSON.parse(JSON.stringify(ACCENT_DRAFT));
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
