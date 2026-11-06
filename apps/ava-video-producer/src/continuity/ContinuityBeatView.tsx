import { useCurrentFrame } from "remotion";
import { enter } from "../motion";
import { ContinuityContent } from "./ContinuityContent";
import css from "./ContinuityScene.module.css";
import { useContinuityCopy } from "./useContinuityCopy";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "./continuitySchema";

type Props = {
  beat: ContinuityBeat;
  accent: string;
  productScene?: ProductSceneRenderer;
};

/** A single editorial or native-product beat in a continuity film. */
export function ContinuityBeatView({ beat, accent, productScene }: Props) {
  const frame = useCurrentFrame();
  const translate = useContinuityCopy();
  return (
    <div className={css.continuityBeat} data-continuity-beat={beat.id}>
      {beat.content.kind !== "product" && beat.content.kind !== "composite" && (
        <header
          className={css.continuityHeading}
          style={enter(frame, 0, { y: 8, dur: 18 })}
        >
          <h1>{translate(beat.title)}</h1>
          <p>{translate(beat.subtitle)}</p>
        </header>
      )}
      <ContinuityContent
        content={beat.content}
        frame={frame}
        accent={accent}
        productScene={productScene}
      />
    </div>
  );
}
