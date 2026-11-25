import { prop, propEq } from "@avandar/utils";
import { getCueWindowFromShot } from "./getCueWindowFromShot";
import type { Shot, Storyboard } from "./storyboardSchema/storyboardSchema";
/** A shot with its absolute first frame and the frame after its last. */
type TimelineShot = Shot & { startFrame: number; endFrame: number };
/** A narration cue whose frames are absolute film frames. */
type NarrationCue = Storyboard["narration"][number];
/**
 * Compute shot starts once, in the same coordinate system as exported captions.
 */
function _timeline(plan: Storyboard): TimelineShot[] {
  let startFrame = 0;
  return plan.shots.map((shot) => {
    const entry = {
      ...shot,
      startFrame,
      endFrame: startFrame + shot.durationInFrames,
    };
    startFrame = entry.endFrame;
    return entry;
  });
}
/**
 * The absolute first frames of the shots that declare a hard cut with
 * `transition: {kind: "cut"}`, in film order. The storyboard render passes
 * these to the frame gate. An undeclared hard cut is never included.
 */
function _declaredCutFrames(plan: Storyboard): number[] {
  return _timeline(plan)
    .filter((shot) => {
      return shot.transition?.kind === "cut";
    })
    .map(prop("startFrame"));
}
/** Returns the total shot duration of a storyboard, in frames. */
function _durationInFrames(plan: Storyboard): number {
  return plan.shots.reduce((sum, shot) => {
    return sum + shot.durationInFrames;
  }, 0);
}
/** Resolve local narration cues to absolute film frames. */
function _absoluteCues(plan: Storyboard): NarrationCue[] {
  const shots = _timeline(plan);
  return plan.narration.map((cue) => {
    const shot = shots.find(propEq("id", cue.shotId))!;
    const offset =
      shot.startFrame +
      getCueWindowFromShot({ shot, beatId: cue.beatId }).start;
    return {
      ...cue,
      startFrame: offset + cue.startFrame,
      endFrame: offset + cue.endFrame,
    };
  });
}

/**
 * Derives shot timing, declared cuts, and absolute narration cues from a
 * storyboard.
 */
export const StoryboardTimeline = {
  /**
   * Compute shot starts once, in the same coordinate system as exported
   * captions.
   */
  timeline: _timeline,
  /**
   * The absolute first frames of the shots that declare a hard cut with
   * `transition: {kind: "cut"}`, in film order.
   */
  declaredCutFrames: _declaredCutFrames,
  /** Returns the total shot duration of a storyboard, in frames. */
  durationInFrames: _durationInFrames,
  /** Resolve local narration cues to absolute film frames. */
  absoluteCues: _absoluteCues,
};
