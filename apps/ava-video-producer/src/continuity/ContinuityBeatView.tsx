import { useCurrentFrame } from "remotion";
import { enter } from "../motion";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoProps } from "../videoTheme/useVideoTheme";
import { ContinuityContent } from "./ContinuityContent";
import css from "./ContinuityScene/ContinuityScene.module.css";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "./continuitySchema";
import type { ReactNode } from "react";

type Props = {
  beat: ContinuityBeat;
  accent: string;
  productScene?: ProductSceneRenderer;
};

/** A single editorial or native-product beat in a continuity film. */
export function ContinuityBeatView({
  beat,
  accent,
  productScene,
}: Props): ReactNode {
  const frame = useCurrentFrame();
  const heading = useVideoProps("Heading", {});
  const motion = useVideoMotion();
  return (
    <div className={css.continuityBeat} data-continuity-beat={beat.id}>
      {beat.content.kind !== "product" && beat.content.kind !== "composite" && (
        <header
          className={css.continuityHeading}
          style={enter(frame, 0, {
            y: heading.entranceDistance,
            dur: motion.scale(heading.entranceDuration),
            easing: motion.curve(heading.entranceEasing),
          })}
        >
          <h1>{beat.title}</h1>
          <p>{beat.subtitle}</p>
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
