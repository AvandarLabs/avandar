import assert from "node:assert/strict";
import test from "node:test";
import {
  DUR,
  EASE,
  STAGGER,
  STAGGER_COLUMN,
  loopEnvelope,
  loopPhase,
  wave,
} from "../src/motion";

test("loop motion is bounded, periodic, and deterministic under out-of-order seeks", () => {
  const frames = [-361, -180, -1, 0, 1, 45, 90, 179, 180, 361];
  for (const offset of [-28, 0, 37]) {
    const values = frames.map((frame) => {
      return [loopPhase(frame, 180, offset), wave(frame, 180, offset)];
    });
    for (const frame of [...frames].reverse()) {
      const phase = loopPhase(frame, 180, offset);
      const pulse = wave(frame, 180, offset);
      assert.ok(phase >= 0 && phase < 1);
      assert.ok(pulse >= 0 && pulse <= 1);
      assert.equal(phase, loopPhase(frame + 180, 180, offset));
      assert.equal(pulse, wave(frame + 180, 180, offset));
      assert.deepEqual([phase, pulse], values[frames.indexOf(frame)]);
    }
  }
  assert.equal(loopPhase(-45, 180), 0.75);
  assert.equal(loopPhase(37, 180, 37), 0);
  assert.equal(wave(0, 180), 0);
  assert.equal(wave(90, 180), 1);
});

test("loop envelopes preserve a full reading hold and meet the same boundary ground", () => {
  assert.equal(loopEnvelope(0, 180), 0);
  assert.equal(loopEnvelope(179, 180), 0);
  assert.equal(loopEnvelope(-1, 180), 0);
  assert.equal(loopEnvelope(180, 180), 0);
  for (let frame = 0; frame < 180; frame++) {
    const opacity = loopEnvelope(frame, 180);
    assert.ok(
      opacity >= 0 && opacity <= 1,
      `Invalid envelope opacity at ${frame}`,
    );
    if (frame >= 12 && frame <= 167) {
      assert.equal(opacity, 1);
    }
  }
  assert.ok(loopEnvelope(1, 180) < loopEnvelope(6, 180));
  assert.ok(loopEnvelope(173, 180) > loopEnvelope(178, 180));
});

test("loop helpers reject invalid timing before it reaches SVG geometry", () => {
  for (const helper of [loopPhase, wave]) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(() => {
        return helper(value, 180);
      });
      assert.throws(() => {
        return helper(30, value);
      });
      assert.throws(() => {
        return helper(30, 180, value);
      });
    }
    for (const period of [0, -180])
      assert.throws(() => {
        return helper(30, period);
      });
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => {
      return loopEnvelope(value, 180);
    });
    assert.throws(() => {
      return loopEnvelope(30, value);
    });
    assert.throws(() => {
      return loopEnvelope(30, 180, value);
    });
  }
  for (const [duration, fade] of [
    [0, 12],
    [1, 12],
    [24, 12],
    [180, 0],
    [180, -1],
    [180, 90],
  ]) {
    assert.throws(() => {
      return loopEnvelope(30, duration, fade);
    });
  }
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
