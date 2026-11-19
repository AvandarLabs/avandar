import assert from "node:assert/strict";
import test from "node:test";
import {
  caretOn,
  DUR,
  EASE,
  enter,
  enterAt,
  leave,
  loopEnvelope,
  pop,
  press,
  ramp,
  STAGGER,
} from "../../motion";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { createVideoMotion } from "./createVideoMotion";

function _motionAtTempo(tempo: number) {
  const patch = { other: { video: { atomic: { tempo: { md: tempo } } } } };
  return createVideoMotion(
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic", {
      patches: [patch],
    }).semantic.motion,
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

function _motionWith(semantic: object) {
  return createVideoMotion(
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic", {
      patches: [{ other: { video: { semantic: { motion: semantic } } } }],
    }).semantic.motion,
  );
}

test("classic themed helpers draw exactly what the motion.ts helpers draw", () => {
  const motion = _motionAtTempo(1);
  const frames = [0, 3, 7, 12, 19, 40];
  assert.deepEqual(
    frames.map((frame) => {
      return [
        motion.ramp(frame, 2, 12),
        motion.reveal(frame, 2),
        motion.enter(frame, 2),
        motion.enterAt(frame, 2, 3),
        motion.leave(frame, 2),
        motion.pop(frame, 2),
        motion.press(frame, 2),
        motion.caretOn(frame),
        motion.loopEnvelope(frame + 150, 180),
      ];
    }),
    frames.map((frame) => {
      return [
        ramp(frame, 2, 12),
        ramp(frame, 2, 12),
        enter(frame, 2),
        enterAt(frame, 2, 3),
        leave(frame, 2),
        pop(frame, 2),
        press(frame, 2),
        caretOn(frame),
        loopEnvelope(frame + 150, 180),
      ];
    }),
  );
});

test("an easing family replaces the entrance, travel, and reveal curves", () => {
  const motion = _motionWith({ easingProfile: "smooth" });
  assert.deepEqual(
    [
      motion.entrance.easing(0.25),
      motion.travel.easing(0.25),
      motion.reveal.easing(0.25),
    ],
    [EASE.inOut(0.25), EASE.inOut(0.25), EASE.inOut(0.25)],
  );
});

test("the stagger option multiplies every stagger", () => {
  const motion = createVideoMotion(
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic", {
      patches: [
        {
          other: {
            video: {
              atomic: { multiplier: { double: 2 } },
              semantic: {
                motion: { staggerScale: "$atomic.multiplier.double" },
              },
            },
          },
        },
      ],
    }).semantic.motion,
  );
  assert.deepEqual(
    [
      motion.stagger.list,
      motion.stagger.column,
      motion.rise.stagger,
      motion.scaleStagger(6),
    ],
    [4, 1, 6, 12],
  );
});

test("a preset's own stagger follows the tempo and the stagger option", () => {
  assert.deepEqual(
    [_motionAtTempo(1).scaleStagger(6), _motionAtTempo(1.5).scaleStagger(6)],
    [6, 4],
  );
});

test("each entrance style animates only what it names", () => {
  const styleAt = (entranceStyle: string) => {
    return _motionWith({ entranceStyle }).enter(4, 0);
  };
  assert.deepEqual(
    [styleAt("fade").transform, styleAt("none").opacity],
    [undefined, 1],
  );
  assert.match(String(styleAt("scale").transform), /scale\(0\.9\d+\)/);
});
