import assert from "node:assert/strict";
import test from "node:test";
import { FILM_REFUSAL_CODES } from "../../../../showcase/filmThemeMessageHelpers/filmThemeMessageHelpers";
import {
  getCurrentAcknowledgement,
  getThemeExportState,
  receiveThemeAcknowledgement,
} from "./themeExportStateHelpers";

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
  FILM_REFUSAL_CODES.forEach((code) => {
    assert.deepEqual(
      getThemeExportState({
        ...WAITING,
        acknowledgement: { issues: [{ path: "", message: code }] },
      }),
      { kind: "refused", reason: code },
    );
  });
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

const REFUSED_A = {
  type: "film-theme-error",
  id: "film",
  issues: [{ path: "color.accent", message: "Unknown reference" }],
  requestKey: "film:hashA:0",
} as const;

test("a refusal is tagged with the request the player says it answers", () => {
  assert.deepEqual(receiveThemeAcknowledgement(REFUSED_A, "film"), {
    issues: REFUSED_A.issues,
    requestKey: "film:hashA:0",
  });
  assert.deepEqual(
    receiveThemeAcknowledgement(
      { type: "film-theme", id: "film", hash: "abc", requestKey: "k" },
      "film",
    ),
    { hash: "abc", issues: [], requestKey: "k" },
  );
  assert.equal(receiveThemeAcknowledgement(REFUSED_A, "other"), undefined);
  assert.equal(
    receiveThemeAcknowledgement({ type: "nope" }, "film"),
    undefined,
  );
});

test("a refusal for request A never shows for request B, even if B is already current", () => {
  // The draft moved on to B while A's refusal was still in flight. The
  // refusal must not take B's tag just because B is current when it lands.
  const refusalForA = receiveThemeAcknowledgement(REFUSED_A, "film");
  const requestB = "film:hashB:0";
  assert.equal(getCurrentAcknowledgement(refusalForA, requestB), undefined);
  assert.deepEqual(
    getThemeExportState({
      ...WAITING,
      acknowledgement: getCurrentAcknowledgement(refusalForA, requestB),
    }),
    { kind: "pending" },
  );
});

test("a refusal that names no request answers none", () => {
  const { requestKey: _omitted, ...unlabelled } = REFUSED_A;
  const refusal = receiveThemeAcknowledgement(unlabelled, "film");
  assert.equal(getCurrentAcknowledgement(refusal, "film:hashA:0"), undefined);
});
