import { positioned } from "../../positioned";
import { MediaCallout } from "../MediaCallout/MediaCallout";
import { MediaCropPlane } from "../MediaCropPlane/MediaCropPlane";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { MediaSceneProps as SceneInput } from "../../scenes.types";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  caption: ReturnType<typeof useVideoTokens>["text"]["stage"]["caption"];
  bounds: Rect;
  title: SceneInput["title"];
  kind: SceneInput["kind"];
  src: string;
  trimBefore: number;
  crop: NonNullable<SceneInput["crop"]>;
  callouts: NonNullable<SceneInput["callouts"]>;
  mediaStyle: CSSProperties;
  captionLineHeight: number;
};
/** Renders media figure. */
export function MediaFigure({
  bounds,
  frame,
  tokens,
  motion,
  scales,
  scene,
  ...content
}: Readonly<Props>): ReactNode {
  const layer = { bounds, frame, tokens, motion, scales, scene, ...content };
  const { callouts } = content;
  return (
    <figure
      style={{
        ...positioned(bounds),
        margin: 0,
        border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
        borderRadius: scales.corner(tokens.corner.scene),
        background: scene.background,
        overflow: "hidden",
        ...motion.enter(frame, 0, { y: 0, dur: motion.sheet }),
      }}
    >
      <MediaCropPlane {...layer} />
      {callouts.map((callout) => {
        return <MediaCallout key={callout.id} callout={callout} {...layer} />;
      })}
    </figure>
  );
}
