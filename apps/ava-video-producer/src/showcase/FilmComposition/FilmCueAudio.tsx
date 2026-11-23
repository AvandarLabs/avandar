import { Audio, Sequence, staticFile } from "remotion";
import { StoryboardTimeline } from "../../storyboard/schema/StoryboardTimeline";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { ReactNode } from "react";

type Props = Readonly<{ plan: Storyboard }>;
/** Plays the authored per-cue recordings at their storyboard positions. */
export function FilmCueAudio({ plan }: Props): ReactNode {
  return StoryboardTimeline.absoluteCues(plan).map((cue) => {
    return cue.audio ? (
      <Sequence
        key={cue.id}
        from={cue.startFrame}
        durationInFrames={cue.endFrame - cue.startFrame}
      >
        <Audio src={staticFile(cue.audio)} />
      </Sequence>
    ) : null;
  });
}
