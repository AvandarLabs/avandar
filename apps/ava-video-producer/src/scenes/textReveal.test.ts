import assert from "node:assert/strict";
import test from "node:test";
import {
  getHeadingRevealStyles,
  getLineRevealStyle,
  getStagedExitStyle,
  getTypographyRevealFrames,
  getWipeExitStyle,
} from "./textReveal";

test("a cut-in line is hidden before its frame and fully shown on it", () => {
  assert.equal(getLineRevealStyle(9, 10, "cut").opacity, 0);
  assert.equal(getLineRevealStyle(10, 10, "cut").opacity, 1);
});

test("a line fade is part-visible mid-reveal and settles at rest", () => {
  const middle = Number(getLineRevealStyle(12, 10, "line-fade").opacity);
  assert.ok(middle > 0 && middle < 1);
  const settled = getLineRevealStyle(40, 10, "line-fade");
  assert.equal(settled.opacity, 1);
  assert.equal(settled.transform, "translate(0.00px, 0.00px)");
});

test("a line fade with no rise only changes opacity", () => {
  assert.equal(
    getLineRevealStyle(12, 10, "line-fade", { rise: 0 }).transform,
    "translate(0.00px, 0.00px)",
  );
});

test("a wipe starts fully clipped from the right and ends unclipped at rest", () => {
  assert.equal(
    getLineRevealStyle(10, 10, "wipe").clipPath,
    "inset(0 100% 0 0)",
  );
  const settled = getLineRevealStyle(40, 10, "wipe");
  assert.equal(settled.clipPath, "inset(0 0% 0 0)");
  assert.equal(settled.transform, "translateX(0.00%)");
});

test("a scene heading rises in by default, the kicker a panel after the title", () => {
  const styles = getHeadingRevealStyles(0, undefined);
  assert.equal(styles.title.opacity, 0);
  assert.equal(getHeadingRevealStyles(40, undefined).title.opacity, 1);
  assert.equal(getHeadingRevealStyles(8, undefined).kicker.opacity, 0);
  assert.equal(styles.title.clipPath, undefined);
});

test("a wiped scene heading reveals the title, then the kicker, left to right", () => {
  const reveal = { mode: "wipe" as const, atFrame: 7, staggerFrames: 8 };
  assert.equal(
    getHeadingRevealStyles(7, reveal).title.clipPath,
    "inset(0 100% 0 0)",
  );
  assert.equal(
    getHeadingRevealStyles(30, reveal).title.clipPath,
    "inset(0 0% 0 0)",
  );
  assert.equal(
    getHeadingRevealStyles(15, reveal).kicker.clipPath,
    "inset(0 100% 0 0)",
  );
  assert.equal(
    getHeadingRevealStyles(40, reveal).kicker.clipPath,
    "inset(0 0% 0 0)",
  );
});

test("a wipe exit retracts from the right until nothing is left", () => {
  assert.equal(getWipeExitStyle(10, 10, 6).clipPath, "inset(0 0% 0 0)");
  assert.equal(getWipeExitStyle(16, 10, 6).clipPath, "inset(0 100% 0 0)");
});

test("a staged exit fades each element out after the one before it", () => {
  const exit = { atFrame: 20, staggerFrames: 3, durationInFrames: 6 };
  const opacityAt = (frame: number, index: number) =>
    Number(getStagedExitStyle(frame, exit, index).opacity);
  assert.equal(opacityAt(19, 0), 1);
  assert.ok(opacityAt(22, 0) < 1);
  assert.equal(opacityAt(22, 1), 1);
  assert.equal(opacityAt(29, 1), 0);
});

test("an element with no exit stays fully visible", () => {
  assert.deepEqual(getStagedExitStyle(500, undefined, 0), {});
});

test("an icon leads the lines by a panel unless it has its own frame", () => {
  assert.deepEqual(getTypographyRevealFrames(6, undefined), {
    linesAt: 6,
  });
  assert.deepEqual(getTypographyRevealFrames(6, {}), {
    iconAt: 6,
    linesAt: 15,
  });
  assert.deepEqual(getTypographyRevealFrames(17, { atFrame: 0 }), {
    iconAt: 0,
    linesAt: 17,
  });
});
