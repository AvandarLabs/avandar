import {
  getMotionDuration,
  type MotionOptions,
} from "../motion-components/motionSettings";

/** A beat's authored length and incoming overlap. */
export type TimedBeat = {
  duration: number;
  transition: { frames: number; motion?: MotionOptions };
};

/** Resolve beat positions while retaining a readable interval between overlaps. */
export function getContinuityTimeline(beats: readonly TimedBeat[]) {
  let end = 0;
  return beats.map((beat, index) => {
    const overlap =
      index === 0
        ? 0
        : getMotionDuration(beat.transition.frames, beat.transition.motion);
    const outgoing = getMotionDuration(
      beats[index + 1]?.transition.frames ?? 0,
      beats[index + 1]?.transition.motion,
    );
    if (overlap + outgoing >= beat.duration) {
      throw new Error("Transition overlap must leave a readable beat interval");
    }
    const start = end - overlap;
    end = start + beat.duration;
    return { start, end };
  });
}

/** Sample one stock reveal, then hold its resolved pose before the loop reset. */
export function sampleStockFrame(frame: number, settleFrame = 150) {
  return Math.min(settleFrame, 12 + Math.max(0, frame) * 0.85);
}

/** Keep a product segment mounted and hold its final authored fixture state. */
export function getProductFrame(
  frame: number,
  segment: { fromFrame: number; toFrame: number; leadIn: number },
) {
  return Math.min(
    segment.toFrame,
    segment.fromFrame + Math.max(0, frame - segment.leadIn),
  );
}
