import assert from "node:assert/strict";
import test from "node:test";
import {
  getActiveHeadline,
  getCarouselPoses,
  getCarouselState,
  getFlipSplit,
  getPullBack,
  getScrollOffset,
  getSideEntrance,
  getWhipEntrance,
  getWindowRevealStyle,
  getWhipExit,
  getWindowCamera,
} from "./windowMotion";
import { WINDOW_BOXES, WINDOW_TILT } from "./windowTilt";

const canvas = { width: 1920, height: 1080 };
const box = { x: 678, y: 188, width: 1158, height: 724 };

test("a whip entrance starts beyond the right edge and settles at the resting tilt", () => {
  const start = getWhipEntrance(1, 1, canvas, box);
  assert.ok(box.x + start.translateX >= canvas.width);
  assert.ok(start.blurX > 0);
  const settled = getWhipEntrance(40, 1, canvas, box);
  assert.equal(settled.translateX, 0);
  assert.equal(settled.rotateY, WINDOW_TILT.rotateY);
  assert.equal(settled.blurX, 0);
});

test("a whip exit accelerates past the left edge with growing blur", () => {
  assert.equal(getWhipExit(99, 100, box).translateX, 0);
  const early = getWhipExit(102, 100, box);
  const late = getWhipExit(106, 100, box);
  assert.ok(late.translateX - early.translateX < early.translateX);
  assert.ok(late.blurX > early.blurX);
  assert.ok(box.x + box.width + getWhipExit(108, 100, box).translateX <= 0);
});

test("a whip exit with a longer duration is still on screen when the default would be gone", () => {
  const offscreen = (frame: number, durationInFrames?: number) => {
    return (
      box.x +
        box.width +
        getWhipExit(frame, 100, box, durationInFrames).translateX <=
      0
    );
  };
  assert.equal(offscreen(108), true);
  assert.equal(offscreen(108, 12), false);
  assert.equal(offscreen(112, 12), true);
  assert.ok(
    getWhipExit(105, 100, box, 12).translateX >
      getWhipExit(105, 100, box).translateX,
  );
});

test("the tall window box is taller than the default box and stays on the canvas", () => {
  assert.ok(WINDOW_BOXES.tall.height > WINDOW_BOXES.default.height);
  assert.ok(WINDOW_BOXES.tall.y < WINDOW_BOXES.default.y);
  for (const windowBox of Object.values(WINDOW_BOXES)) {
    assert.ok(windowBox.x + windowBox.width <= 1);
    assert.ok(windowBox.y + windowBox.height <= 1);
  }
});

test("the carousel slides the next window in on top and swaps a cut window at once", () => {
  const windows = [
    {},
    { atFrame: 20, swap: "slide" as const },
    { atFrame: 50, swap: "cut" as const },
  ];
  assert.deepEqual(getCarouselState(10, windows), { current: 0, progress: 1 });
  const sliding = getCarouselState(22, windows);
  assert.equal(sliding.current, 1);
  assert.equal(sliding.previous, 0);
  assert.ok(sliding.progress > 0 && sliding.progress < 1);
  assert.deepEqual(getCarouselState(50, windows), { current: 2, progress: 1 });
});

test("a carousel's outgoing window stays opaque until the incoming one mostly covers it", () => {
  assert.equal(getCarouselPoses(0.3, box).outgoing.opacity, 1);
  assert.equal(getCarouselPoses(0.5, box).outgoing.opacity, 1);
  const late = getCarouselPoses(0.75, box).outgoing.opacity;
  assert.ok(late > 0 && late < 1);
  assert.equal(getCarouselPoses(1, box).outgoing.opacity, 0);
  assert.ok(getCarouselPoses(0.3, box).outgoing.translateX < 0);
});

test("a pull-back holds the footage full-bleed until it starts, then lands in the box", () => {
  const enter = { kind: "pull-back" as const, atFrame: 30 };
  const before = getPullBack(29, enter, canvas, box);
  assert.deepEqual(before.rect, { x: 0, y: 0, ...canvas });
  assert.equal(before.tilt, 0);
  const landed = getPullBack(60, enter, canvas, box);
  assert.deepEqual(landed.rect, box);
  assert.equal(landed.tilt, 1);
});

test("a flip-split card is hidden before it starts", () => {
  assert.equal(getFlipSplit(0, 1, canvas.width).opacity, 0);
});

test("a flip-split card turns in nearly edge-on, then splits into two windows", () => {
  const start = getFlipSplit(1, 1, canvas.width);
  assert.ok(start.rotateY >= 75);
  assert.equal(start.split, 0);
  const joined = getFlipSplit(9, 1, canvas.width);
  assert.equal(joined.rotateY, 0);
  assert.equal(joined.split, 0);
  assert.equal(getFlipSplit(30, 1, canvas.width).split, 1);
});

test("a window camera scales the window about its anchor and blurs only while moving", () => {
  const keys = [
    { at: 0, x: 0, y: 0.5, zoom: 1 },
    { at: 20, x: 0, y: 0.5, zoom: 1 },
    { at: 30, x: 0, y: 0.5, zoom: 1.5 },
  ];
  assert.equal(getWindowCamera(10, keys, box).scale, 1);
  const moving = getWindowCamera(25, keys, box);
  assert.ok(moving.scale > 1 && moving.blurX > 0);
  const held = getWindowCamera(40, keys, box);
  assert.equal(held.scale, 1.5);
  assert.equal(held.blurX, 0);
  assert.equal(held.originX, 0);
});

test("a later headline replaces the earlier one, which fades out just before it", () => {
  const headlines = [{ atFrame: 1 }, { atFrame: 60 }];
  assert.deepEqual(getActiveHeadline(30, headlines), { index: 0, opacity: 1 });
  const leaving = getActiveHeadline(58, headlines);
  assert.equal(leaving.index, 0);
  assert.ok(leaving.opacity < 1);
  assert.equal(getActiveHeadline(60, headlines).index, 1);
});

test("scroll steps jump the content to each authored offset in turn", () => {
  const steps = [
    { atFrame: 20, offset: 0.3 },
    { atFrame: 50, offset: 0.6 },
  ];
  assert.equal(getScrollOffset(10, steps), 0);
  assert.equal(getScrollOffset(40, steps), 0.3);
  assert.equal(getScrollOffset(80, steps), 0.6);
});

test("a whip entrance lands after its authored duration", () => {
  const moving = getWhipEntrance(18, 1, canvas, box, 20);
  assert.ok(moving.translateX > 0 && moving.blurX > 0);
  const landed = getWhipEntrance(21, 1, canvas, box, 20);
  assert.equal(landed.translateX, 0);
  assert.equal(landed.blurX, 0);
});

test("side entrances bring the left window from the left edge and the right one from the right", () => {
  const left = { x: 67, y: 194, width: 791, height: 664 };
  const right = { x: 1060, y: 194, width: 791, height: 664 };
  const leftStart = getSideEntrance(5, 5, 0, canvas, left);
  const rightStart = getSideEntrance(5, 5, 1, canvas, right);
  assert.ok(left.x + left.width + leftStart.translateX <= 0);
  assert.ok(right.x + rightStart.translateX >= canvas.width);
  assert.ok(leftStart.blurX > 0 && rightStart.blurX > 0);
  const landed = getSideEntrance(16, 5, 0, canvas, left, 11);
  assert.equal(landed.translateX, 0);
  assert.equal(landed.blurX, 0);
  assert.ok(getSideEntrance(10, 5, 1, canvas, right, 11).translateX > 0);
});

test("a stepped reveal clips the window to rising columns, then lets go", () => {
  const reveal = { columns: 4, durationInFrames: 4 };
  assert.match(
    String(getWindowRevealStyle(10, 10, reveal).clipPath),
    /^polygon\(/,
  );
  assert.ok(getWindowRevealStyle(12, 10, reveal).clipPath);
  assert.deepEqual(getWindowRevealStyle(14, 10, reveal), {});
  assert.deepEqual(getWindowRevealStyle(10, 10, undefined), {});
});

test("an in-out pull-back starts gently and passes the halfway box at its midpoint", () => {
  const word = { kind: "pull-back" as const, atFrame: 0, durationInFrames: 10 };
  const inOut = { ...word, ease: "inOut" as const };
  const early = getPullBack(1, inOut, canvas, box);
  assert.ok(early.tilt < getPullBack(1, word, canvas, box).tilt);
  assert.ok(Math.abs(getPullBack(5, inOut, canvas, box).tilt - 0.5) < 0.01);
  assert.equal(getPullBack(10, inOut, canvas, box).tilt, 1);
});
