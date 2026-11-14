import assert from "node:assert/strict";
import test from "node:test";
import { DUR, EASE, STAGGER } from "../../motion";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { createVideoMotion } from "./createVideoMotion";

function _motionAtTempo(tempo: number) {
  const patch = { other: { video: { atomic: { tempo: { md: tempo } } } } };
  return createVideoMotion(
    resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [patch] })
      .semantic.motion,
  );
}

test("classic motion equals today's durations and curves", () => {
  const motion = _motionAtTempo(1);
  assert.deepEqual(
    [motion.panel, motion.hero, motion.stagger.list],
    [DUR.panel, DUR.hero, STAGGER],
  );
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    assert.equal(motion.entrance.easing(progress), EASE.out(progress));
  }
});

test("a faster tempo shortens durations and staggers", () => {
  const motion = _motionAtTempo(1.5);
  assert.deepEqual(
    [motion.panel, motion.stagger.list, motion.scale(106)],
    [6, 2 / 1.5, 106 / 1.5],
  );
});

test("tempo never changes the period of a repeating motion", () => {
  assert.equal(
    _motionAtTempo(0.8).pulse.period,
    _motionAtTempo(1).pulse.period,
  );
});
