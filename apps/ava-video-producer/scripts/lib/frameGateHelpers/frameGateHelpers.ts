// Pure verdict helpers behind `scripts/checkFrames.ts`. The header of that
// script explains what each check exists to catch.

import { makeSet, propEq, propIsDefined } from "@avandar/utils";
import {
  COPY_MATCH_DB,
  CUT_REVERSAL_FRAMES,
  FLAT_CONTRAST_LIMIT,
  LUMA_JUMP,
  TILE_SPIKE_DB,
} from "./frameGateHelpers.constants";
import type {
  FrameMeasurements,
  JudgedCut,
  TiledFrame,
} from "./frameGateHelpers.types";

function _median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => {
    return a - b;
  });
  return sorted[Math.floor(sorted.length / 2)];
}

function _isFlat(contrast: readonly number[], index: number): boolean {
  return (contrast[index] ?? 255) < FLAT_CONTRAST_LIMIT;
}

/** The half matches of the four frames either side of `index`. */
function _neighbourMatches(halves: readonly number[], index: number): number[] {
  const firstNeighbourIndex = Math.max(0, index - 4);
  const lastNeighbourIndex = Math.min(halves.length, index + 5);
  const numNeighbourIndexes = Math.max(
    0,
    lastNeighbourIndex - firstNeighbourIndex,
  );
  return Array.from({ length: numNeighbourIndexes }, (_, offset) => {
    return firstNeighbourIndex + offset;
  })
    .filter((neighbourIndex) => {
      return neighbourIndex !== index && halves[neighbourIndex] !== undefined;
    })
    .map((neighbourIndex) => {
      return halves[neighbourIndex];
    });
}

/** The frame's spike over its neighbours, or undefined when it is not tiled. */
function _getTileSpike(options: {
  halves: readonly number[];
  contrast: readonly number[];
  index: number;
}): number | undefined {
  const { halves, contrast, index } = options;
  if (_isFlat(contrast, index)) {
    return undefined;
  }
  const neighbourMatches = _neighbourMatches(halves, index);
  if (!neighbourMatches.length) {
    return undefined;
  }
  const spike = halves[index] - _median(neighbourMatches);
  if (!(spike > TILE_SPIKE_DB)) {
    return undefined;
  }
  const bordersFlat =
    (index > 0 && _isFlat(contrast, index - 1)) ||
    (index + 1 < halves.length && _isFlat(contrast, index + 1));
  return bordersFlat && halves[index] < COPY_MATCH_DB ? undefined : spike;
}

/**
 * How far the luma swings back after a cut, measured from the furthest point
 * it reaches in the cut's direction within `CUT_REVERSAL_FRAMES`.
 */
function _measureReversal(options: {
  luma: readonly number[];
  frame: number;
  direction: number;
}): { reversal: number; reversalFrame: number | undefined } {
  const { luma, frame, direction } = options;
  const lastFrame = Math.min(luma.length - 1, frame + CUT_REVERSAL_FRAMES);
  const laterFrames = Array.from(
    { length: Math.max(0, lastFrame - frame) },
    (_, offset) => {
      return frame + 1 + offset;
    },
  );
  return laterFrames.reduce<{
    furthest: number;
    reversal: number;
    reversalFrame: number | undefined;
  }>(
    (state, laterFrame) => {
      const furthest =
        direction > 0
          ? Math.max(state.furthest, luma[laterFrame])
          : Math.min(state.furthest, luma[laterFrame]);
      const swingBack = direction * (furthest - luma[laterFrame]);
      return swingBack > state.reversal
        ? { furthest, reversal: swingBack, reversalFrame: laterFrame }
        : { ...state, furthest };
    },
    { furthest: luma[frame], reversal: 0, reversalFrame: undefined },
  );
}

/**
 * Frames whose halves match far better than their neighbours do: Chromium's
 * wrapped-texture frames. A frame bordering a near-uniform frame must also
 * match like a copy (`COPY_MATCH_DB`), since it is partly that flat field.
 * `checkFrames` fails a render that has any.
 */
export function getTiledFramesFromMeasurements(
  measurements: Readonly<Pick<FrameMeasurements, "halves" | "contrast">>,
): TiledFrame[] {
  // `halves` can be sparse, so walk every index rather than its entries.
  return Array.from({ length: measurements.halves.length }, (_, frame) => {
    return {
      frame,
      spike: _getTileSpike({
        halves: measurements.halves,
        contrast: measurements.contrast,
        index: frame,
      }),
    };
  }).filter(propIsDefined("spike"));
}

/**
 * Judges each declared cut, where `frame` is the first frame of the new shot.
 * `accepted`: the jump is over `LUMA_JUMP` and holds. `flash`: it swings back
 * by more than `LUMA_JUMP` within `CUT_REVERSAL_FRAMES`. `under-limit`: the
 * ordinary rule already passes it. `outside-video`: no frame before it.
 * `checkFrames` reports every verdict and exempts only accepted cuts.
 */
export function makeJudgedCutsFromLuma(
  luma: readonly number[],
  declaredCuts: readonly number[],
): JudgedCut[] {
  return declaredCuts.map((frame) => {
    if (frame < 1 || frame >= luma.length) {
      return { frame, verdict: "outside-video" };
    }
    const jump = luma[frame] - luma[frame - 1];
    const { reversal, reversalFrame } = _measureReversal({
      luma,
      frame,
      direction: Math.sign(jump),
    });
    const isOverLimit = Math.abs(jump) > LUMA_JUMP;
    const flashOrAccepted = reversal > LUMA_JUMP ? "flash" : "accepted";
    const verdict = isOverLimit ? flashOrAccepted : "under-limit";
    return { frame, verdict, jump, reversal, reversalFrame };
  });
}

/**
 * Frame-to-frame luma changes over `LUMA_JUMP`, except onto the frame of a
 * declared cut judged `accepted`. `checkFrames` fails a render that has any.
 */
export function getLumaJumpsFromLuma(
  luma: readonly number[],
  judgedCuts: ReadonlyArray<Pick<JudgedCut, "frame" | "verdict">>,
): Array<{ from: number; to: number; jump: number }> {
  const acceptedFrames = makeSet(
    judgedCuts.filter(propEq("verdict", "accepted")),
    { key: "frame" },
  );
  return luma
    .slice(1)
    .map((value, offset) => {
      return {
        from: offset,
        to: offset + 1,
        jump: Math.abs(value - luma[offset]),
      };
    })
    .filter(({ to, jump }) => {
      return jump > LUMA_JUMP && !acceptedFrames.has(to);
    });
}
