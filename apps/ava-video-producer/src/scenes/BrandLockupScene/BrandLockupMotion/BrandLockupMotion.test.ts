import assert from "node:assert/strict";
import test from "node:test";
import { BrandLockupMotion } from "./BrandLockupMotion";

test("mark columns rise left to right one stagger apart", () => {
  const progress = BrandLockupMotion.getMarkBuildProgress({
    frame: 10,
    build: { atFrame: 5, columns: 4, staggerFrames: 1.5, durationInFrames: 8 },
  });
  assert.equal(progress.length, 4);
  assert.ok(progress[0] > progress[1] && progress[1] > progress[2]);
  assert.ok(progress[3] > 0, "the fourth column started at frame 9.5");
});
test("a mark with no build is shown complete from the first frame", () => {
  assert.deepEqual(
    BrandLockupMotion.getMarkBuildProgress({
      frame: 0,
      build: undefined,
      columns: 6,
    }),
    new Array(6).fill(1),
  );
});
test("a flying column starts on its slice of the mark and ends on its slice of the frame", () => {
  const mark = { x: 600, y: 400, width: 400, height: 200 };
  const frame = { width: 1920, height: 1080 };
  assert.deepEqual(
    BrandLockupMotion.getFlightColumnRect(1, 4, mark, frame, 0),
    { x: 700, y: 400, width: 100, height: 200 },
  );
  assert.deepEqual(
    BrandLockupMotion.getFlightColumnRect(1, 4, mark, frame, 1),
    { x: 480, y: 0, width: 480, height: 1080 },
  );
});
test("the fly-through retracts the wordmark before the columns leave", () => {
  const exit = { kind: "fly-through" as const, atFrame: 90 };
  assert.deepEqual(BrandLockupMotion.getFlightProgress({ frame: 89, exit }), {
    retract: 0,
    flight: 0,
    cover: 0,
  });
  const early = BrandLockupMotion.getFlightProgress({ frame: 92, exit });
  assert.ok(early.retract > 0 && early.flight === 0);
  const done = BrandLockupMotion.getFlightProgress({ frame: 130, exit });
  assert.deepEqual(done, { retract: 1, flight: 1, cover: 1 });
});
test("the CTA types its command only after the subtitle and URL have arrived", () => {
  const beats = BrandLockupMotion.getCtaBeats({
    cta: { atFrame: 20, command: "a".repeat(30) },
    charsPerSecond: 30,
  });
  assert.ok(beats.urlAt > beats.subtitleAt);
  assert.ok(beats.typingAt > beats.urlAt);
  assert.equal(beats.typingEnd - beats.typingAt, 30);
  assert.ok(beats.badgeAt > beats.typingEnd);
});
