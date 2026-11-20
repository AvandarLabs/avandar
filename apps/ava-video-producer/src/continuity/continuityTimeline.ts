import {
  type MotionOptions,
  MotionSettings,
} from "../motion-components/MotionSettings/MotionSettings";
/** A beat's authored length and incoming overlap. */
export type TimedBeat = {
  duration: number;
  transition: { frames: number; motion?: MotionOptions };
};
/**
 * Resolve beat positions while retaining a readable interval between overlaps.
 */
export function getContinuityTimeline(beats: readonly TimedBeat[]): Array<{
  start: number;
  end: number;
}> {
  let end = 0;
  return beats.map((beat, index) => {
    const overlap =
      index === 0
        ? 0
        : MotionSettings.getMotionDuration({
            frames: beat.transition.frames,
            options: beat.transition.motion,
          });
    const outgoing = MotionSettings.getMotionDuration({
      frames: beats[index + 1]?.transition.frames ?? 0,
      options: beats[index + 1]?.transition.motion,
    });
    if (overlap + outgoing >= beat.duration) {
      throw new Error("Transition overlap must leave a readable beat interval");
    }
    const start = end - overlap;
    end = start + beat.duration;
    return { start, end };
  });
}
/**
 * Sample one stock reveal, then hold its resolved pose before the loop reset.
 */
export function sampleStockFrame(frame: number, settleFrame = 150): number {
  return Math.min(settleFrame, 12 + Math.max(0, frame) * 0.85);
}
/** Keep a product segment mounted and hold its final authored fixture state. */
export function getProductFrame(
  frame: number,
  segment: { fromFrame: number; toFrame: number; leadIn: number },
): number {
  return Math.min(
    segment.toFrame,
    segment.fromFrame + Math.max(0, frame - segment.leadIn),
  );
}
