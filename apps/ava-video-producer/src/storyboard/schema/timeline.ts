import { getCueWindowFromShot } from "./getCueWindowFromShot";
import type { Shot, Storyboard } from "./storyboardSchema";

/** A shot with its absolute first frame and the frame after its last. */
type TimelineShot = Shot & { startFrame: number; endFrame: number };

/** A narration cue whose frames are absolute film frames. */
type NarrationCue = Storyboard["narration"][number];

/**
 * Compute shot starts once, in the same coordinate system as exported captions.
 */
export function timeline(plan: Storyboard): TimelineShot[] {
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
export function declaredCutFrames(plan: Storyboard): number[] {
  return timeline(plan)
    .filter((shot) => {
      return shot.transition?.kind === "cut";
    })
    .map((shot) => {
      return shot.startFrame;
    });
}

export function durationInFrames(plan: Storyboard): number {
  return plan.shots.reduce((sum, shot) => {
    return sum + shot.durationInFrames;
  }, 0);
}

/** Resolve local narration cues to absolute film frames. */
export function absoluteCues(plan: Storyboard): NarrationCue[] {
  const shots = timeline(plan);
  return plan.narration.map((cue) => {
    const shot = shots.find((candidate) => {
      return candidate.id === cue.shotId;
    })!;
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
