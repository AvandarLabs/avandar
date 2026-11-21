import assert from "node:assert/strict";
import { Motion } from "../motion";

/** Assertions for periodic motion bounds, seek stability and invalid timing. */
export const MotionLoopAssertions = {
  /** Checks bounds, periodicity and seek determinism for one loop frame. */
  assertLoopFrame: ({
    frame,
    offset,
    frames,
    values,
  }: Readonly<{
    frame: number;
    offset: number;
    frames: readonly number[];
    values: ReadonlyArray<readonly number[]>;
  }>): void => {
    const phase = Motion.loopPhase({
      frame,
      period: 180,
      offset,
    });
    const pulse = Motion.wave({
      frame,
      period: 180,
      offset,
    });
    assert.ok(phase >= 0 && phase < 1);
    assert.ok(pulse >= 0 && pulse <= 1);
    assert.equal(
      phase,
      Motion.loopPhase({
        frame: frame + 180,
        period: 180,
        offset,
      }),
    );
    assert.equal(
      pulse,
      Motion.wave({
        frame: frame + 180,
        period: 180,
        offset,
      }),
    );
    assert.deepEqual([phase, pulse], values[frames.indexOf(frame)]);
  },
  /** Checks periodic loop samples at the supplied offset. */
  assertPeriodicSamples: ({
    frames,
    offset,
  }: Readonly<{ frames: readonly number[]; offset: number }>): void => {
    const values = frames.map((frame) => {
      return [
        Motion.loopPhase({
          frame,
          period: 180,
          offset,
        }),
        Motion.wave({
          frame,
          period: 180,
          offset,
        }),
      ];
    });
    [...frames].reverse().forEach((frame) => {
      MotionLoopAssertions.assertLoopFrame({ frame, offset, frames, values });
    });
  },
  /** Checks the repeated envelope boundary and negative frame. */
  assertEnvelopeBoundary: (): void => {
    assert.equal(
      Motion.loopEnvelope({
        frame: 0,
        duration: 180,
      }),
      0,
    );
    assert.equal(
      Motion.loopEnvelope({
        frame: 179,
        duration: 180,
      }),
      0,
    );
    assert.equal(
      Motion.loopEnvelope({
        frame: -1,
        duration: 180,
      }),
      0,
    );
    assert.equal(
      Motion.loopEnvelope({
        frame: 180,
        duration: 180,
      }),
      0,
    );
  },
  /** Checks invalid numeric timing for both periodic helpers. */
  assertInvalidPeriodicTiming: (): void => {
    Array.from([Motion.loopPhase, Motion.wave]).forEach((helper) => {
      Array.from([NaN, Infinity, -Infinity]).forEach((value) => {
        assert.throws(() => {
          return helper({
            frame: value,
            period: 180,
          });
        });
        assert.throws(() => {
          return helper({
            frame: 30,
            period: value,
          });
        });
        assert.throws(() => {
          return helper({
            frame: 30,
            period: 180,
            offset: value,
          });
        });
      });
      Array.from([0, -180]).forEach((period) => {
        assert.throws(() => {
          return helper({
            frame: 30,
            period,
          });
        });
      });
    });
  },
  /** Checks non-finite envelope timing. */
  assertInvalidEnvelopeNumbers: (): void => {
    Array.from([NaN, Infinity, -Infinity]).forEach((value) => {
      assert.throws(() => {
        return Motion.loopEnvelope({
          frame: value,
          duration: 180,
        });
      });
      assert.throws(() => {
        return Motion.loopEnvelope({
          frame: 30,
          duration: value,
        });
      });
      assert.throws(() => {
        return Motion.loopEnvelope({
          frame: 30,
          duration: 180,
          fadeFrames: value,
        });
      });
    });
  },
};
