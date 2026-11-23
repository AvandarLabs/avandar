import { Audio, Sequence, staticFile } from "remotion";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { ReactNode } from "react";

type Props = Readonly<{ plan: Storyboard }>;
/** Plays the authored narration track at their storyboard positions. */
export function FilmTrackAudio({ plan }: Props): ReactNode {
  return plan.narrationTrack ? (
    <Sequence from={plan.narrationTrack.startFrame}>
      <Audio
        src={staticFile(plan.narrationTrack.src)}
        volume={plan.narrationTrack.volume}
      />
    </Sequence>
  ) : null;
}
