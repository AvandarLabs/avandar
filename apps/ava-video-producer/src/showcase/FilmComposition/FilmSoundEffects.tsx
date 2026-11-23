import { Audio, Sequence, staticFile } from "remotion";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { ReactNode } from "react";

type Props = Readonly<{ plan: Storyboard }>;
/** Plays the authored sound effects at their storyboard positions. */
export function FilmSoundEffects({ plan }: Props): ReactNode {
  return plan.soundEffects.map((sound) => {
    return (
      <Sequence key={sound.id} from={sound.atFrame}>
        <Audio src={staticFile(sound.src)} volume={sound.volume} />
      </Sequence>
    );
  });
}
