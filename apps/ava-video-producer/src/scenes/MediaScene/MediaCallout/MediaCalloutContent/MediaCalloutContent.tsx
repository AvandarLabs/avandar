import { MediaCalloutLabel } from "../MediaCalloutLabel/MediaCalloutLabel";
import { MediaCalloutOutline } from "../MediaCalloutOutline/MediaCalloutOutline";
import css from "./MediaCalloutContent.module.css";
import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { MediaSceneProps as SceneInput } from "../../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  caption: ReturnType<typeof useVideoTokens>["text"]["stage"]["caption"];
  callout: NonNullable<SceneInput["callouts"]>[number];
  opacity: number;
  labelWidth: number;
  label: ReturnType<typeof TextLayout.fitTextLines>;
  labelX: number;
  labelY: number;
};
/** Renders media callout content. */
export function MediaCalloutContent({
  tokens,
  scales,
  spacing,
  scene,
  caption,
  callout,
  opacity,
  labelWidth,
  label,
  labelX,
  labelY,
}: Readonly<Props>): ReactNode {
  return (
    <div
      key={callout.id}
      className={css.mediaCalloutContentdiv1}
      style={{ opacity }}
    >
      <MediaCalloutOutline {...{ tokens, scales, scene, callout }} />
      <MediaCalloutLabel
        {...{
          tokens,
          scales,
          spacing,
          scene,
          caption,
          labelWidth,
          label,
          labelX,
          labelY,
        }}
      />
    </div>
  );
}
