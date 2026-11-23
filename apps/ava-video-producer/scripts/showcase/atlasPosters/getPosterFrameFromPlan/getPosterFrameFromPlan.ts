import { getContinuityTimeline } from "../../../../src/continuity/continuityTimeline";
import { getMotionDuration } from "../../../../src/motion-components/motionSettings";
import { timeline } from "../../../../src/storyboard/schema/timeline";
import type { Storyboard } from "../../../../src/storyboard/schema/schema";

/**
 * The frame an Atlas card poster shows: the middle of the middle beat's
 * reading hold for a continuity shot, so neither transition is mid-flight,
 * or 65% into the middle shot of a plain scene plan, the same point a
 * storyboard render takes its poster from.
 */
export function getPosterFrameFromPlan(plan: Storyboard): number {
  const shots = timeline(plan);
  const shot = shots[Math.floor(shots.length / 2)];
  if (shot.scene !== "continuity") {
    return shot.startFrame + Math.floor(shot.durationInFrames * 0.65);
  }
  const beats = shot.props.beats;
  const index = Math.floor(beats.length / 2);
  const { start, end } = getContinuityTimeline(beats)[index];
  const incoming =
    index === 0
      ? 0
      : getMotionDuration(
          beats[index].transition.frames,
          beats[index].transition.motion,
        );
  const outgoing = getMotionDuration(
    beats[index + 1]?.transition.frames ?? 0,
    beats[index + 1]?.transition.motion,
  );
  return shot.startFrame + Math.floor((start + incoming + end - outgoing) / 2);
}
