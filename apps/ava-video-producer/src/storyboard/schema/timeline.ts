import type { Storyboard } from "./storyboardSchema";

/** Compute shot starts once, in the same coordinate system as exported captions. */
export function timeline(plan: Storyboard) {
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

export function durationInFrames(plan: Storyboard): number {
  return plan.shots.reduce((sum, shot) => sum + shot.durationInFrames, 0);
}

/** Resolve local narration cues to absolute film frames. */
export function absoluteCues(plan: Storyboard) {
  const shots = timeline(plan);
  return plan.narration.map((cue) => {
    const offset = shots.find((shot) => shot.id === cue.shotId)!.startFrame;
    return {
      ...cue,
      startFrame: offset + cue.startFrame,
      endFrame: offset + cue.endFrame,
    };
  });
}
