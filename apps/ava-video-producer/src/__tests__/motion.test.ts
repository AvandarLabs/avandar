import assert from "node:assert/strict";
import test from "node:test";
import { DUR, EASE, STAGGER, STAGGER_COLUMN, Motion } from "../motion";
import { MotionLoopAssertions } from "./MotionLoopAssertions";

test("loop motion is bounded, periodic, and deterministic under out-of-order seeks", () => {
  const frames = [-361, -180, -1, 0, 1, 45, 90, 179, 180, 361];
  [-28, 0, 37].forEach((offset) => {
    MotionLoopAssertions.assertPeriodicSamples({ frames, offset });
  });
  assert.equal(
    Motion.loopPhase({
      frame: -45,
      period: 180,
    }),
    0.75,
  );
  assert.equal(
    Motion.loopPhase({
      frame: 37,
      period: 180,
      offset: 37,
    }),
    0,
  );
  assert.equal(
    Motion.wave({
      frame: 0,
      period: 180,
    }),
    0,
  );
  assert.equal(
    Motion.wave({
      frame: 90,
      period: 180,
    }),
    1,
  );
});

test("loop envelopes preserve a full reading hold and meet the same boundary ground", () => {
  MotionLoopAssertions.assertEnvelopeBoundary();
  for (let frame = 0; frame < 180; frame++) {
    const opacity = Motion.loopEnvelope({
      frame,
      duration: 180,
    });
    assert.ok(
      opacity >= 0 && opacity <= 1,
      `Invalid envelope opacity at ${frame}`,
    );
    if (frame >= 12 && frame <= 167) {
      assert.equal(opacity, 1);
    }
  }
  assert.ok(
    Motion.loopEnvelope({
      frame: 1,
      duration: 180,
    }) <
      Motion.loopEnvelope({
        frame: 6,
        duration: 180,
      }),
  );
  assert.ok(
    Motion.loopEnvelope({
      frame: 173,
      duration: 180,
    }) >
      Motion.loopEnvelope({
        frame: 178,
        duration: 180,
      }),
  );
});

test("loop helpers reject invalid timing before it reaches SVG geometry", () => {
  MotionLoopAssertions.assertInvalidPeriodicTiming();
  MotionLoopAssertions.assertInvalidEnvelopeNumbers();
  Array.from([
    [0, 12],
    [1, 12],
    [24, 12],
    [180, 0],
    [180, -1],
    [180, 90],
  ]).forEach(([duration, fade]) => {
    assert.throws(() => {
      return Motion.loopEnvelope({
        frame: 30,
        duration,
        fadeFrames: fade,
      });
    });
  });
});

test("EASE.in departs slowly and reaches full speed at the end", () => {
  assert.equal(EASE.in(0), 0);
  assert.equal(EASE.in(1), 1);
  assert.ok(EASE.in(0.25) < 0.1, "a departure barely moves at first");
  assert.ok(EASE.in(0.9) - EASE.in(0.8) > EASE.in(0.2) - EASE.in(0.1));
});

test("EASE.surge holds at both ends and spends its travel in the middle", () => {
  assert.ok(EASE.surge(0.2) < 0.08, "the surge starts slower than inOut");
  assert.ok(EASE.surge(0.2) < EASE.inOut(0.2));
  assert.ok(EASE.surge(0.8) > 0.9, "the surge lands early and settles");
});

test("whip and column-stagger tokens are faster than the beats they replace", () => {
  assert.ok(DUR.whip < DUR.panel);
  assert.ok(DUR.whip > DUR.chip);
  assert.ok(STAGGER_COLUMN > 0 && STAGGER_COLUMN < 1);
  assert.ok(STAGGER_COLUMN < STAGGER);
});

test("positional and named blend exports preserve film numeric and token values", async () => {
  const vocabulary = await import("../motion");
  assert.equal(vocabulary.mix(0.25, 10, 30), 15);
  assert.equal(vocabulary.mix({ t: 0.25, from: 10, to: 30 }), 15);
  assert.equal(vocabulary.Motion.mix({ t: 0.25, from: 10, to: 30 }), 15);
  Array.from([-1, 0.256, 2]).forEach((progress) => {
    const expected = [
      "color-mix(in oklab, var(--to) 0%, var(--from))",
      "color-mix(in oklab, var(--to) 26%, var(--from))",
      "color-mix(in oklab, var(--to) 100%, var(--from))",
    ][[-1, 0.256, 2].indexOf(progress)];
    assert.equal(
      vocabulary.mixToken(progress, "var(--from)", "var(--to)"),
      expected,
    );
    assert.equal(
      vocabulary.mixToken({
        t: progress,
        from: "var(--from)",
        to: "var(--to)",
      }),
      expected,
    );
    assert.equal(
      vocabulary.Motion.mixToken({
        t: progress,
        from: "var(--from)",
        to: "var(--to)",
      }),
      expected,
    );
  });
});

test("legacy and named progress calls retain clamping and zero-duration semantics", async () => {
  const vocabulary = await import("../motion");
  const linear = (progress: number) => {
    return progress;
  };
  Array.from([
    [0, 0],
    [10, 0],
    [14.5, 0.5],
    [19, 1],
    [50, 1],
  ]).forEach(([frame, expected]) => {
    assert.equal(vocabulary.ramp(frame, 10, 9, linear), expected);
    assert.equal(
      vocabulary.ramp({ frame, at: 10, dur: 9, easing: linear }),
      expected,
    );
    assert.equal(
      vocabulary.Motion.ramp({ frame, at: 10, dur: 9, easing: linear }),
      expected,
    );
  });
  assert.equal(vocabulary.ramp(0, 10, 0, linear), 1);
  assert.equal(
    vocabulary.Motion.ramp({ frame: 0, at: 10, dur: 0, easing: linear }),
    1,
  );
  assert.equal(
    vocabulary.ramp({
      frame: 10,
      at: 10,
      easing: () => {
        return -0;
      },
    }),
    0,
  );
});

test("film entrance and departure signatures preserve transforms and scale behavior", async () => {
  const vocabulary = await import("../motion");
  const opts = { x: -8, y: 16, scale: 0.9 };
  const entrance = {
    opacity: 0,
    transform: "translate(-8.00px, 16.00px) scale(0.9000)",
  };
  const departure = { opacity: 0, transform: "translate(-8.00px, 16.00px)" };
  assert.deepEqual(vocabulary.enter(10, 10, opts), entrance);
  assert.deepEqual(vocabulary.enter({ frame: 10, at: 10, opts }), entrance);
  assert.deepEqual(
    vocabulary.Motion.enter({ frame: 10, at: 10, opts }),
    entrance,
  );
  assert.deepEqual(vocabulary.enterAt(14, 10, 2, opts), entrance);
  assert.deepEqual(
    vocabulary.enterAt({ frame: 14, at: 10, index: 2, opts }),
    entrance,
  );
  assert.deepEqual(
    vocabulary.Motion.enterAt({ frame: 14, at: 10, index: 2, opts }),
    entrance,
  );
  assert.deepEqual(vocabulary.leave(16, 10, opts), departure);
  assert.deepEqual(vocabulary.leave({ frame: 16, at: 10, opts }), departure);
  assert.deepEqual(
    vocabulary.Motion.leave({ frame: 16, at: 10, opts }),
    departure,
  );
});

test("film spring press counter and typing signatures preserve boundary values", async () => {
  const vocabulary = await import("../motion");
  assert.equal(vocabulary.pop(23, 10), 1);
  assert.equal(vocabulary.pop({ frame: 23, at: 10 }), 1);
  assert.equal(vocabulary.Motion.pop({ frame: 23, at: 10 }), 1);
  assert.equal(vocabulary.press(9, 10), 1);
  assert.equal(vocabulary.press({ frame: 9, at: 10 }), 1);
  assert.equal(vocabulary.Motion.press({ frame: 9, at: 10 }), 1);
  assert.equal(vocabulary.countTo(23, 10, 42), 42);
  assert.equal(vocabulary.countTo({ frame: 23, at: 10, to: 42 }), 42);
  assert.equal(vocabulary.Motion.countTo({ frame: 23, at: 10, to: 42 }), 42);
  assert.equal(vocabulary.typed(40, 10, "abcdefgh", 4), "abcd");
  assert.equal(
    vocabulary.typed({ frame: 40, at: 10, text: "abcdefgh", cps: 4 }),
    "abcd",
  );
  assert.equal(
    vocabulary.Motion.typed({ frame: 40, at: 10, text: "abcdefgh", cps: 4 }),
    "abcd",
  );
  assert.equal(vocabulary.caretOn(15), false);
  assert.equal(vocabulary.Motion.caretOn(15), false);
});

test("film periodic helpers preserve negative offsets and exact loop endpoints", async () => {
  const vocabulary = await import("../motion");
  assert.equal(vocabulary.loopPhase(-45, 180), 0.75);
  assert.equal(vocabulary.loopPhase({ frame: -45, period: 180 }), 0.75);
  assert.equal(vocabulary.Motion.loopPhase({ frame: -45, period: 180 }), 0.75);
  assert.equal(vocabulary.wave(90, 180), 1);
  assert.equal(vocabulary.wave({ frame: 90, period: 180 }), 1);
  assert.equal(vocabulary.Motion.wave({ frame: 90, period: 180 }), 1);
  assert.equal(vocabulary.loopEnvelope(179, 180), 0);
  assert.equal(vocabulary.loopEnvelope({ frame: 179, duration: 180 }), 0);
  assert.equal(
    vocabulary.Motion.loopEnvelope({ frame: 179, duration: 180 }),
    0,
  );
  Array.from([
    vocabulary.bezier(0, 0, 1, 1),
    vocabulary.bezier({ x1: 0, y1: 0, x2: 1, y2: 1 }),
    vocabulary.Motion.bezier({ x1: 0, y1: 0, x2: 1, y2: 1 }),
  ]).forEach((easing) => {
    assert.equal(easing(-1), 0);
    assert.equal(easing(2), 1);
    assert.ok(Math.abs(easing(0.25) - 0.25) < 1e-6);
  });
});
