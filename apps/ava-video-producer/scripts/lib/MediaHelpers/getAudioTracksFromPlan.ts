import { type Storyboard } from "../../../src/storyboard/schema/schema";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import type { AudioTrack } from "./MediaHelpers.types";
/** Returns approved narration and sound-effect sources in filter order. */
export function getAudioTracksFromPlan(
  plan: Readonly<Storyboard>,
): AudioTrack[] {
  return [
    ...(plan.narrationTrack
      ? [
          {
            src: plan.narrationTrack.src,
            atFrame: plan.narrationTrack.startFrame,
            volume: plan.narrationTrack.volume,
          },
        ]
      : []),
    ...StoryboardTimeline.absoluteCues(plan).flatMap((cue) => {
      return cue.audio
        ? [{ src: cue.audio, atFrame: cue.startFrame, volume: 1 }]
        : [];
    }),
    ...plan.soundEffects,
  ];
}
