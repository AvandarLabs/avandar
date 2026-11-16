import assert from "node:assert/strict";
import test from "node:test";
import {
  getCtaBeats,
  getFlightColumnRect,
  getFlightProgress,
  getMarkBuildProgress,
} from "./brandLockupMotion";

test("mark columns rise left to right one stagger apart", () => {
  const progress = getMarkBuildProgress(10, {
    atFrame: 5,
    columns: 4,
    staggerFrames: 1.5,
    durationInFrames: 8,
  });
  assert.equal(progress.length, 4);
  assert.ok(progress[0] > progress[1] && progress[1] > progress[2]);
  assert.ok(progress[3] > 0, "the fourth column started at frame 9.5");
});

test("a mark with no build is shown complete from the first frame", () => {
  assert.deepEqual(getMarkBuildProgress(0, undefined, 6), new Array(6).fill(1));
});

test("a flying column starts on its slice of the mark and ends on its slice of the frame", () => {
  const mark = { x: 600, y: 400, width: 400, height: 200 };
  const frame = { width: 1920, height: 1080 };
  assert.deepEqual(getFlightColumnRect(1, 4, mark, frame, 0), {
    x: 700,
    y: 400,
    width: 100,
    height: 200,
  });
  assert.deepEqual(getFlightColumnRect(1, 4, mark, frame, 1), {
    x: 480,
    y: 0,
    width: 480,
    height: 1080,
  });
});

test("the fly-through retracts the wordmark before the columns leave", () => {
  const exit = { kind: "fly-through" as const, atFrame: 90 };
  assert.deepEqual(getFlightProgress(89, exit), {
    retract: 0,
    flight: 0,
    cover: 0,
  });
  const early = getFlightProgress(92, exit);
  assert.ok(early.retract > 0 && early.flight === 0);
  const done = getFlightProgress(130, exit);
  assert.deepEqual(done, { retract: 1, flight: 1, cover: 1 });
});

test("the CTA types its command only after the subtitle and URL have arrived", () => {
  const beats = getCtaBeats({ atFrame: 20, command: "a".repeat(30) }, 30);
  assert.ok(beats.urlAt > beats.subtitleAt);
  assert.ok(beats.typingAt > beats.urlAt);
  assert.equal(beats.typingEnd - beats.typingAt, 30);
  assert.ok(beats.badgeAt > beats.typingEnd);
});
