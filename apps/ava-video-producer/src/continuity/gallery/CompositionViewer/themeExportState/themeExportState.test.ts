import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentAcknowledgement,
  getThemeExportState,
} from "./themeExportState";

const WAITING = {
  isScene: false,
  hasDraftIssues: false,
  expectedHash: "abc",
  acknowledgement: undefined,
  isTimedOut: false,
} as const;

test("a scene study is always ready, because it takes no theme", () => {
  assert.deepEqual(
    getThemeExportState({ ...WAITING, isScene: true, hasDraftIssues: true }),
    { kind: "ready" },
  );
});

test("a continuity film waits until its player acknowledges the expected hash", () => {
  assert.deepEqual(getThemeExportState(WAITING), { kind: "pending" });
  assert.deepEqual(
    getThemeExportState({
      ...WAITING,
      acknowledgement: { hash: "old", issues: [] },
    }),
    { kind: "pending" },
  );
  assert.deepEqual(
    getThemeExportState({
      ...WAITING,
      acknowledgement: { hash: "abc", issues: [] },
    }),
    { kind: "ready" },
  );
});

test("a player that never acknowledges times out instead of pending forever", () => {
  assert.deepEqual(getThemeExportState({ ...WAITING, isTimedOut: true }), {
    kind: "timed-out",
  });
});

test("a matching acknowledgement wins over a timeout that fired first", () => {
  assert.deepEqual(
    getThemeExportState({
      ...WAITING,
      isTimedOut: true,
      acknowledgement: { hash: "abc", issues: [] },
    }),
    { kind: "ready" },
  );
});

test("a player refusal names its reason from the error code", () => {
  for (const code of [
    "film-unsupported",
    "payload-too-large",
    "payload-unreadable",
    "theme-unresolvable",
  ] as const) {
    assert.deepEqual(
      getThemeExportState({
        ...WAITING,
        acknowledgement: { issues: [{ path: "", message: code }] },
      }),
      { kind: "refused", reason: code },
    );
  }
});

test("a refusal with theme issues reports them as theme issues", () => {
  assert.deepEqual(
    getThemeExportState({
      ...WAITING,
      acknowledgement: {
        issues: [{ path: "color.accent", message: "Unknown reference" }],
      },
    }),
    { kind: "refused", reason: "theme-issues" },
  );
});

test("draft issues refuse the export before the player is asked", () => {
  assert.deepEqual(
    getThemeExportState({
      ...WAITING,
      hasDraftIssues: true,
      acknowledgement: { hash: "abc", issues: [] },
    }),
    { kind: "refused", reason: "draft-issues" },
  );
});

test("a snapshot the gallery cannot resolve is refused as unresolvable", () => {
  assert.deepEqual(
    getThemeExportState({ ...WAITING, expectedHash: undefined }),
    {
      kind: "refused",
      reason: "theme-unresolvable",
    },
  );
});

test("a refusal answers only the request it was sent for", () => {
  const refusal = {
    issues: [{ path: "", message: "payload-too-large" }],
    requestKey: "film:abc:0",
  };
  assert.equal(getCurrentAcknowledgement(refusal, "film:abc:0"), refusal);
  assert.equal(getCurrentAcknowledgement(refusal, "film:def:0"), undefined);
  assert.equal(getCurrentAcknowledgement(refusal, "film:abc:1"), undefined);
});

test("a resolved hash stays current, because the hash itself says what it answered", () => {
  const resolved = { hash: "abc", issues: [], requestKey: "film:abc:0" };
  assert.equal(getCurrentAcknowledgement(resolved, "film:def:0"), resolved);
  assert.equal(getCurrentAcknowledgement(undefined, "film:abc:0"), undefined);
});
