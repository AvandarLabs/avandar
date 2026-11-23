import { ContinuityTimeline } from "../../../../src/continuity/ContinuityTimeline/ContinuityTimeline";
import { MotionSettings } from "../../../../src/motion-components/MotionSettings/MotionSettings";
import { StoryboardTimeline } from "../../../../src/storyboard/schema/StoryboardTimeline";
import type { Storyboard } from "../../../../src/storyboard/schema/schema";
/**
 * The frame an Atlas card poster shows: the middle of the middle beat's
 * reading hold for a continuity shot, so neither transition is mid-flight,
 * or 65% into the middle shot of a plain scene plan, the same point a
 * storyboard render takes its poster from.
 */
export function getPosterFrameFromPlan(plan: Storyboard): number {
  const shots = StoryboardTimeline.timeline(plan);
  const shot = shots[Math.floor(shots.length / 2)];
  if (shot.scene !== "continuity") {
    return shot.startFrame + Math.floor(shot.durationInFrames * 0.65);
  }
  const beats = shot.props.beats;
  const index = Math.floor(beats.length / 2);
  const { start, end } = ContinuityTimeline.getContinuityTimeline(beats)[index];
  const incoming =
    index === 0
      ? 0
      : MotionSettings.getMotionDuration({
          frames: beats[index].transition.frames,
          options: beats[index].transition.motion,
        });
  const outgoing = MotionSettings.getMotionDuration({
    frames: beats[index + 1]?.transition.frames ?? 0,
    options: beats[index + 1]?.transition.motion,
  });
  return shot.startFrame + Math.floor((start + incoming + end - outgoing) / 2);
}
