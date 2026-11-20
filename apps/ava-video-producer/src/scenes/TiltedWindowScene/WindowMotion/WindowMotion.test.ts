import assert from "node:assert/strict";
import test from "node:test";
import { StageTheme } from "../../StageTheme/StageTheme";
import { WINDOW_BOXES } from "../windowTilt";
import { WindowMotion } from "./WindowMotion";

const canvas = { width: 1920, height: 1080 };
const box = { x: 678, y: 188, width: 1158, height: 724 };
test("a whip entrance starts beyond the right edge and settles at the resting tilt", () => {
  const start = WindowMotion.getWhipEntrance({ frame: 1, at: 1, canvas, box });
  assert.ok(box.x + start.translateX >= canvas.width);
  assert.ok(start.blurX > 0);
  const settled = WindowMotion.getWhipEntrance({
    frame: 40,
    at: 1,
    canvas,
    box,
  });
  assert.equal(settled.translateX, 0);
  assert.equal(
    settled.rotateY,
    StageTheme.getClassicStageTheme().components.WindowTilt.rotateY,
  );
  assert.equal(settled.blurX, 0);
});
test("a whip exit accelerates past the left edge with growing blur", () => {
  assert.equal(
    WindowMotion.getWhipExit({ frame: 99, at: 100, box }).translateX,
    0,
  );
  const early = WindowMotion.getWhipExit({ frame: 102, at: 100, box });
  const late = WindowMotion.getWhipExit({ frame: 106, at: 100, box });
  assert.ok(late.translateX - early.translateX < early.translateX);
  assert.ok(late.blurX > early.blurX);
  assert.ok(
    box.x +
      box.width +
      WindowMotion.getWhipExit({ frame: 108, at: 100, box }).translateX <=
      0,
  );
});
test("a whip exit with a longer duration is still on screen when the default would be gone", () => {
  const offscreen = (frame: number, durationInFrames?: number) => {
    return (
      box.x +
        box.width +
        WindowMotion.getWhipExit({ frame, at: 100, box, durationInFrames })
          .translateX <=
      0
    );
  };
  assert.equal(offscreen(108), true);
  assert.equal(offscreen(108, 12), false);
  assert.equal(offscreen(112, 12), true);
  assert.ok(
    WindowMotion.getWhipExit({ frame: 105, at: 100, box, durationInFrames: 12 })
      .translateX >
      WindowMotion.getWhipExit({ frame: 105, at: 100, box }).translateX,
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
  assert.deepEqual(WindowMotion.getCarouselState({ frame: 10, windows }), {
    current: 0,
    progress: 1,
  });
  const sliding = WindowMotion.getCarouselState({ frame: 22, windows });
  assert.equal(sliding.current, 1);
  assert.equal(sliding.previous, 0);
  assert.ok(sliding.progress > 0 && sliding.progress < 1);
  assert.deepEqual(WindowMotion.getCarouselState({ frame: 50, windows }), {
    current: 2,
    progress: 1,
  });
});
test("a carousel's outgoing window stays opaque until the incoming one mostly covers it", () => {
  assert.equal(
    WindowMotion.getCarouselPoses({ progress: 0.3, box }).outgoing.opacity,
    1,
  );
  assert.equal(
    WindowMotion.getCarouselPoses({ progress: 0.5, box }).outgoing.opacity,
    1,
  );
  const late = WindowMotion.getCarouselPoses({ progress: 0.75, box }).outgoing
    .opacity;
  assert.ok(late > 0 && late < 1);
  assert.equal(
    WindowMotion.getCarouselPoses({ progress: 1, box }).outgoing.opacity,
    0,
  );
  assert.ok(
    WindowMotion.getCarouselPoses({ progress: 0.3, box }).outgoing.translateX <
      0,
  );
});
test("a pull-back holds the footage full-bleed until it starts, then lands in the box", () => {
  const enter = { kind: "pull-back" as const, atFrame: 30 };
  const before = WindowMotion.getPullBack({ frame: 29, enter, canvas, box });
  assert.deepEqual(before.rect, { x: 0, y: 0, ...canvas });
  assert.equal(before.tilt, 0);
  const landed = WindowMotion.getPullBack({ frame: 60, enter, canvas, box });
  assert.deepEqual(landed.rect, box);
  assert.equal(landed.tilt, 1);
});
test("a flip-split card is hidden before it starts", () => {
  assert.equal(
    WindowMotion.getFlipSplit({ frame: 0, at: 1, canvasWidth: canvas.width })
      .opacity,
    0,
  );
});
test("a flip-split card turns in nearly edge-on, then splits into two windows", () => {
  const start = WindowMotion.getFlipSplit({
    frame: 1,
    at: 1,
    canvasWidth: canvas.width,
  });
  assert.ok(start.rotateY >= 75);
  assert.equal(start.split, 0);
  const joined = WindowMotion.getFlipSplit({
    frame: 9,
    at: 1,
    canvasWidth: canvas.width,
  });
  assert.equal(joined.rotateY, 0);
  assert.equal(joined.split, 0);
  assert.equal(
    WindowMotion.getFlipSplit({ frame: 30, at: 1, canvasWidth: canvas.width })
      .split,
    1,
  );
});
test("a window camera scales the window about its anchor and blurs only while moving", () => {
  const keys = [
    { at: 0, x: 0, y: 0.5, zoom: 1 },
    { at: 20, x: 0, y: 0.5, zoom: 1 },
    { at: 30, x: 0, y: 0.5, zoom: 1.5 },
  ];
  assert.equal(WindowMotion.getWindowCamera({ frame: 10, keys, box }).scale, 1);
  const moving = WindowMotion.getWindowCamera({ frame: 25, keys, box });
  assert.ok(moving.scale > 1 && moving.blurX > 0);
  const held = WindowMotion.getWindowCamera({ frame: 40, keys, box });
  assert.equal(held.scale, 1.5);
  assert.equal(held.blurX, 0);
  assert.equal(held.originX, 0);
});
test("a later headline replaces the earlier one, which fades out just before it", () => {
  const headlines = [{ atFrame: 1 }, { atFrame: 60 }];
  assert.deepEqual(WindowMotion.getActiveHeadline({ frame: 30, headlines }), {
    index: 0,
    opacity: 1,
  });
  const leaving = WindowMotion.getActiveHeadline({ frame: 58, headlines });
  assert.equal(leaving.index, 0);
  assert.ok(leaving.opacity < 1);
  assert.equal(
    WindowMotion.getActiveHeadline({ frame: 60, headlines }).index,
    1,
  );
});
test("scroll steps jump the content to each authored offset in turn", () => {
  const steps = [
    { atFrame: 20, offset: 0.3 },
    { atFrame: 50, offset: 0.6 },
  ];
  assert.equal(WindowMotion.getScrollOffset({ frame: 10, steps }), 0);
  assert.equal(WindowMotion.getScrollOffset({ frame: 40, steps }), 0.3);
  assert.equal(WindowMotion.getScrollOffset({ frame: 80, steps }), 0.6);
});
test("a whip entrance lands after its authored duration", () => {
  const moving = WindowMotion.getWhipEntrance({
    frame: 18,
    at: 1,
    canvas,
    box,
    durationInFrames: 20,
  });
  assert.ok(moving.translateX > 0 && moving.blurX > 0);
  const landed = WindowMotion.getWhipEntrance({
    frame: 21,
    at: 1,
    canvas,
    box,
    durationInFrames: 20,
  });
  assert.equal(landed.translateX, 0);
  assert.equal(landed.blurX, 0);
});
test("side entrances bring the left window from the left edge and the right one from the right", () => {
  const left = { x: 67, y: 194, width: 791, height: 664 };
  const right = { x: 1060, y: 194, width: 791, height: 664 };
  const leftStart = WindowMotion.getSideEntrance({
    frame: 5,
    at: 5,
    side: 0,
    canvas,
    box: left,
  });
  const rightStart = WindowMotion.getSideEntrance({
    frame: 5,
    at: 5,
    side: 1,
    canvas,
    box: right,
  });
  assert.ok(left.x + left.width + leftStart.translateX <= 0);
  assert.ok(right.x + rightStart.translateX >= canvas.width);
  assert.ok(leftStart.blurX > 0 && rightStart.blurX > 0);
  const landed = WindowMotion.getSideEntrance({
    frame: 16,
    at: 5,
    side: 0,
    canvas,
    box: left,
    durationInFrames: 11,
  });
  assert.equal(landed.translateX, 0);
  assert.equal(landed.blurX, 0);
  assert.ok(
    WindowMotion.getSideEntrance({
      frame: 10,
      at: 5,
      side: 1,
      canvas,
      box: right,
      durationInFrames: 11,
    }).translateX > 0,
  );
});
test("a stepped reveal clips the window to rising columns, then lets go", () => {
  const reveal = { columns: 4, durationInFrames: 4 };
  assert.match(
    String(
      WindowMotion.getWindowRevealStyle({ frame: 10, at: 10, reveal }).clipPath,
    ),
    /^polygon\(/,
  );
  assert.ok(
    WindowMotion.getWindowRevealStyle({ frame: 12, at: 10, reveal }).clipPath,
  );
  assert.deepEqual(
    WindowMotion.getWindowRevealStyle({ frame: 14, at: 10, reveal }),
    {},
  );
  assert.deepEqual(
    WindowMotion.getWindowRevealStyle({ frame: 10, at: 10, reveal: undefined }),
    {},
  );
});
test("an in-out pull-back starts gently and passes the halfway box at its midpoint", () => {
  const word = { kind: "pull-back" as const, atFrame: 0, durationInFrames: 10 };
  const inOut = { ...word, ease: "inOut" as const };
  const early = WindowMotion.getPullBack({
    frame: 1,
    enter: inOut,
    canvas,
    box,
  });
  assert.ok(
    early.tilt <
      WindowMotion.getPullBack({ frame: 1, enter: word, canvas, box }).tilt,
  );
  assert.ok(
    Math.abs(
      WindowMotion.getPullBack({ frame: 5, enter: inOut, canvas, box }).tilt -
        0.5,
    ) < 0.01,
  );
  assert.equal(
    WindowMotion.getPullBack({ frame: 10, enter: inOut, canvas, box }).tilt,
    1,
  );
});
