import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_THEME_DRAFT,
  isThemeDraftEmpty,
  setTokenInDraft,
} from "../themeDraft/themeDraft";
import {
  createEditedRecord,
  createKeptRecord,
  createRebasedRecord,
  createDiscardedRecord,
  isRecordChangedOnDisk,
  type DraftRecord,
} from "./storedDraftRecord";

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
