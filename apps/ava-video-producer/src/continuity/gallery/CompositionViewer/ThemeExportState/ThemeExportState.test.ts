import assert from "node:assert/strict";
import test from "node:test";
import { FILM_REFUSAL_CODES } from "../../../../showcase/FilmThemeMessages/FilmThemeMessages";
import { ThemeExportState } from "./ThemeExportState";

const WAITING = {
  isScene: false,
  hasDraftIssues: false,
  expectedHash: "abc",
  acknowledgement: undefined,
  isTimedOut: false,
} as const;
test("a scene study is always ready, because it takes no theme", () => {
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
      ...WAITING,
      isScene: true,
      hasDraftIssues: true,
    }),
    { kind: "ready" },
  );
});
test("a continuity film waits until its player acknowledges the expected hash", () => {
  assert.deepEqual(ThemeExportState.getThemeExportState(WAITING), {
    kind: "pending",
  });
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
      ...WAITING,
      acknowledgement: { hash: "old", issues: [] },
    }),
    { kind: "pending" },
  );
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
      ...WAITING,
      acknowledgement: { hash: "abc", issues: [] },
    }),
    { kind: "ready" },
  );
});
test("a timed-out acknowledgement state maps to a timed-out export state", () => {
  assert.deepEqual(
    ThemeExportState.getThemeExportState({ ...WAITING, isTimedOut: true }),
    {
      kind: "timed-out",
    },
  );
});
test("a matching acknowledgement wins over a timeout that fired first", () => {
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
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
      ThemeExportState.getThemeExportState({
        ...WAITING,
        acknowledgement: { issues: [{ path: "", message: code }] },
      }),
      { kind: "refused", reason: code },
    );
  });
});
test("a refusal with theme issues reports them as theme issues", () => {
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
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
    ThemeExportState.getThemeExportState({
      ...WAITING,
      hasDraftIssues: true,
      acknowledgement: { hash: "abc", issues: [] },
    }),
    { kind: "refused", reason: "draft-issues" },
  );
});
test("a snapshot the gallery cannot resolve is refused as unresolvable", () => {
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
      ...WAITING,
      expectedHash: undefined,
    }),
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
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: refusal,
      requestKey: "film:abc:0",
    }),
    refusal,
  );
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: refusal,
      requestKey: "film:def:0",
    }),
    undefined,
  );
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: refusal,
      requestKey: "film:abc:1",
    }),
    undefined,
  );
});
test("a resolved hash stays current, because the hash itself says what it answered", () => {
  const resolved = { hash: "abc", issues: [], requestKey: "film:abc:0" };
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: resolved,
      requestKey: "film:def:0",
    }),
    resolved,
  );
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: undefined,
      requestKey: "film:abc:0",
    }),
    undefined,
  );
});
const REFUSED_A = {
  type: "film-theme-error",
  id: "film",
  issues: [{ path: "color.accent", message: "Unknown reference" }],
  requestKey: "film:hashA:0",
} as const;
test("a refusal is tagged with the request the player says it answers", () => {
  assert.deepEqual(
    ThemeExportState.receiveThemeAcknowledgement({
      data: REFUSED_A,
      id: "film",
    }),
    {
      issues: REFUSED_A.issues,
      requestKey: "film:hashA:0",
    },
  );
  assert.deepEqual(
    ThemeExportState.receiveThemeAcknowledgement({
      data: { type: "film-theme", id: "film", hash: "abc", requestKey: "k" },
      id: "film",
    }),
    { hash: "abc", issues: [], requestKey: "k" },
  );
  assert.equal(
    ThemeExportState.receiveThemeAcknowledgement({
      data: REFUSED_A,
      id: "other",
    }),
    undefined,
  );
  assert.equal(
    ThemeExportState.receiveThemeAcknowledgement({
      data: { type: "nope" },
      id: "film",
    }),
    undefined,
  );
});
test("a refusal for request A never shows for request B, even if B is already current", () => {
  // The draft moved on to B while A's refusal was still in flight. The
  // refusal must not take B's tag just because B is current when it lands.
  const refusalForA = ThemeExportState.receiveThemeAcknowledgement({
    data: REFUSED_A,
    id: "film",
  });
  const requestB = "film:hashB:0";
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: refusalForA,
      requestKey: requestB,
    }),
    undefined,
  );
  assert.deepEqual(
    ThemeExportState.getThemeExportState({
      ...WAITING,
      acknowledgement: ThemeExportState.getCurrentAcknowledgement({
        acknowledgement: refusalForA,
        requestKey: requestB,
      }),
    }),
    { kind: "pending" },
  );
});
test("a refusal that names no request answers none", () => {
  const { requestKey: _omitted, ...unlabelled } = REFUSED_A;
  const refusal = ThemeExportState.receiveThemeAcknowledgement({
    data: unlabelled,
    id: "film",
  });
  assert.equal(
    ThemeExportState.getCurrentAcknowledgement({
      acknowledgement: refusal,
      requestKey: "film:hashA:0",
    }),
    undefined,
  );
});
