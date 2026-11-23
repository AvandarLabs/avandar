import assert from "node:assert/strict";
import test from "node:test";
import { DUR, EASE, STAGGER, Motion } from "../../motion";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeVideoMotionFromTokens } from "../makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import { BUILT_IN_VIDEO_THEMES } from "../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";

function _motionAtTempo(tempo: number) {
  const patch = { other: { video: { atomic: { tempo: { md: tempo } } } } };
  return makeVideoMotionFromTokens(
    makeResolvedVideoThemeFromLibrary({
      library: BUILT_IN_VIDEO_THEMES,
      themeId: "classic",
      scope: {
        patches: [patch],
      },
    }).semantic.motion,
  );
}

test("classic motion equals today's durations and curves", () => {
  const motion = _motionAtTempo(1);
  assert.deepEqual(
    [motion.panel, motion.hero, motion.stagger.list],
    [DUR.panel, DUR.hero, STAGGER],
  );
  [0, 0.25, 0.5, 0.75, 1].forEach((progress) => {
    assert.equal(motion.entrance.easing(progress), EASE.out(progress));
  });
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
  return makeVideoMotionFromTokens(
    makeResolvedVideoThemeFromLibrary({
      library: BUILT_IN_VIDEO_THEMES,
      themeId: "classic",
      scope: {
        patches: [{ other: { video: { semantic: { motion: semantic } } } }],
      },
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
    frames.map(_getClassicMotionValuesFromFrame),
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
  const motion = makeVideoMotionFromTokens(
    makeResolvedVideoThemeFromLibrary({
      library: BUILT_IN_VIDEO_THEMES,
      themeId: "classic",
      scope: {
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
      },
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

test("a preset's own stagger scales inversely with tempo", () => {
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

test("classic's themed count draws what countTo draws, and tempo stretches it", () => {
  const classic = _motionAtTempo(1);
  const slow = _motionAtTempo(0.8);
  [0, 10, 20, 30, 40].forEach((frame) => {
    assert.equal(
      classic.count(frame, 10, 1280),
      Motion.countTo({
        frame,
        at: 10,
        to: 1280,
      }),
    );
    assert.equal(
      classic.count(frame, 10, 1280, 20),
      Motion.countTo({
        frame,
        at: 10,
        to: 1280,
        dur: 20,
      }),
    );
  });
  assert.ok(slow.count(20, 10, 1280) < classic.count(20, 10, 1280));
  assert.equal(slow.count(40, 10, 1280), 1280);
});

function _getClassicMotionValuesFromFrame(frame: number): readonly unknown[] {
  return [
    Motion.ramp({
      frame,
      at: 2,
      dur: 12,
    }),
    Motion.ramp({
      frame,
      at: 2,
      dur: 12,
    }),
    Motion.enter({
      frame,
      at: 2,
    }),
    Motion.enterAt({
      frame,
      at: 2,
      index: 3,
    }),
    Motion.leave({
      frame,
      at: 2,
    }),
    Motion.pop({
      frame,
      at: 2,
    }),
    Motion.press({
      frame,
      at: 2,
    }),
    Motion.caretOn(frame),
    Motion.loopEnvelope({
      frame: frame + 150,
      duration: 180,
    }),
  ];
}
