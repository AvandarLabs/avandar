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
  assert.equal(
    getLineRevealStyle({ frame: 9, at: 10, mode: "cut" }).opacity,
    0,
  );
  assert.equal(
    getLineRevealStyle({ frame: 10, at: 10, mode: "cut" }).opacity,
    1,
  );
});
test("a line fade is part-visible mid-reveal and settles at rest", () => {
  const middle = Number(
    getLineRevealStyle({ frame: 12, at: 10, mode: "line-fade" }).opacity,
  );
  assert.ok(middle > 0 && middle < 1);
  const settled = getLineRevealStyle({ frame: 40, at: 10, mode: "line-fade" });
  assert.equal(settled.opacity, 1);
  assert.equal(settled.transform, "translate(0.00px, 0.00px)");
});
test("a line fade with no rise only changes opacity", () => {
  assert.equal(
    getLineRevealStyle({
      frame: 12,
      at: 10,
      mode: "line-fade",
      options: { rise: 0 },
    }).transform,
    "translate(0.00px, 0.00px)",
  );
});
test("a wipe starts fully clipped from the right and ends unclipped at rest", () => {
  assert.equal(
    getLineRevealStyle({ frame: 10, at: 10, mode: "wipe" }).clipPath,
    "inset(0 100% 0 0)",
  );
  const settled = getLineRevealStyle({ frame: 40, at: 10, mode: "wipe" });
  assert.equal(settled.clipPath, "inset(0 0% 0 0)");
  assert.equal(settled.transform, "translateX(0.00%)");
});
test("a scene heading rises in by default, the kicker a panel after the title", () => {
  const styles = getHeadingRevealStyles({ frame: 0, reveal: undefined });
  assert.equal(styles.title.opacity, 0);
  assert.equal(
    getHeadingRevealStyles({ frame: 40, reveal: undefined }).title.opacity,
    1,
  );
  assert.equal(
    getHeadingRevealStyles({ frame: 8, reveal: undefined }).kicker.opacity,
    0,
  );
  assert.equal(styles.title.clipPath, undefined);
});
test("a wiped scene heading reveals the title, then the kicker, left to right", () => {
  const reveal = { mode: "wipe" as const, atFrame: 7, staggerFrames: 8 };
  assert.equal(
    getHeadingRevealStyles({ frame: 7, reveal }).title.clipPath,
    "inset(0 100% 0 0)",
  );
  assert.equal(
    getHeadingRevealStyles({ frame: 30, reveal }).title.clipPath,
    "inset(0 0% 0 0)",
  );
  assert.equal(
    getHeadingRevealStyles({ frame: 15, reveal }).kicker.clipPath,
    "inset(0 100% 0 0)",
  );
  assert.equal(
    getHeadingRevealStyles({ frame: 40, reveal }).kicker.clipPath,
    "inset(0 0% 0 0)",
  );
});
test("a wipe exit retracts from the right until nothing is left", () => {
  assert.equal(
    getWipeExitStyle({ frame: 10, at: 10, durationInFrames: 6 }).clipPath,
    "inset(0 0% 0 0)",
  );
  assert.equal(
    getWipeExitStyle({ frame: 16, at: 10, durationInFrames: 6 }).clipPath,
    "inset(0 100% 0 0)",
  );
});
test("a staged exit fades each element out after the one before it", () => {
  const exit = { atFrame: 20, staggerFrames: 3, durationInFrames: 6 };
  const opacityAt = (frame: number, index: number) => {
    return Number(
      getStagedExitStyle({ frame, exit, orderIndex: index }).opacity,
    );
  };
  assert.equal(opacityAt(19, 0), 1);
  assert.ok(opacityAt(22, 0) < 1);
  assert.equal(opacityAt(22, 1), 1);
  assert.equal(opacityAt(29, 1), 0);
});
test("an element with no exit stays fully visible", () => {
  assert.deepEqual(
    getStagedExitStyle({ frame: 500, exit: undefined, orderIndex: 0 }),
    {},
  );
});
test("an icon leads the lines by a panel unless it has its own frame", () => {
  assert.deepEqual(
    getTypographyRevealFrames({ revealAtFrame: 6, icon: undefined }),
    { linesAt: 6 },
  );
  assert.deepEqual(getTypographyRevealFrames({ revealAtFrame: 6, icon: {} }), {
    iconAt: 6,
    linesAt: 15,
  });
  assert.deepEqual(
    getTypographyRevealFrames({ revealAtFrame: 17, icon: { atFrame: 0 } }),
    { iconAt: 0, linesAt: 17 },
  );
});
