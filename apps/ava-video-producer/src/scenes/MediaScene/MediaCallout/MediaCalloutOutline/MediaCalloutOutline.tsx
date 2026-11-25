import css from "./MediaCalloutOutline.module.css";
import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { MediaSceneProps as SceneInput } from "../../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scales: ReturnType<typeof useVideoShapeScales>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  callout: NonNullable<SceneInput["callouts"]>[number];
};
/** Renders media callout outline. */
export function MediaCalloutOutline({
  tokens,
  scales,
  scene,
  callout,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.mediaCalloutOutlinediv1}
      style={{
        left: `${callout.x * 100}%`,
        top: `${callout.y * 100}%`,
        width: `${callout.width * 100}%`,
        height: `${callout.height * 100}%`,
        border: `${scales.stroke(tokens.stroke.emphasis)}px solid ${scene.brandStrong}`,
        borderRadius: scales.corner(tokens.corner.cell),
      }}
    />
  );
}
