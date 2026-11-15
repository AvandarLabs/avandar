import assert from "node:assert/strict";
import test from "node:test";
import { loopEnvelope, loopPhase, wave } from "../src/motion";

test("loop motion is bounded, periodic, and deterministic under out-of-order seeks", () => {
  const frames = [-361, -180, -1, 0, 1, 45, 90, 179, 180, 361];
  for (const offset of [-28, 0, 37]) {
    const values = frames.map((frame) => [
      loopPhase(frame, 180, offset),
      wave(frame, 180, offset),
    ]);
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
      assert.throws(() => helper(value, 180));
      assert.throws(() => helper(30, value));
      assert.throws(() => helper(30, 180, value));
    }
    for (const period of [0, -180]) assert.throws(() => helper(30, period));
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => loopEnvelope(value, 180));
    assert.throws(() => loopEnvelope(30, value));
    assert.throws(() => loopEnvelope(30, 180, value));
  }
  for (const [duration, fade] of [
    [0, 12],
    [1, 12],
    [24, 12],
    [180, 0],
    [180, -1],
    [180, 90],
  ]) {
    assert.throws(() => loopEnvelope(30, duration, fade));
  }
});
