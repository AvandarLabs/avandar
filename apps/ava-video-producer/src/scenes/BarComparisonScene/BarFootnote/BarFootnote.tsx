import css from "./BarFootnote.module.css";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { ResolvedVideoTheme } from "../../../videoTheme/videoTheme.types";
import type { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { BarComparisonSceneProps as SceneInput } from "../../scenes.types";
import type { ReactNode } from "react";

type PropsSource = SceneInput;
type Props = {
  frame: number;
  bounds: Rect;
  theme: ResolvedVideoTheme;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: VideoMotion;
  props: Omit<PropsSource, "panels">;
};
/** Renders bar footnote. */
export function BarFootnote({
  frame,
  bounds,
  theme,
  tokens,
  motion,
  props,
}: Readonly<Props>): ReactNode {
  return (
    <p
      className={css.barFootnotep1}
      style={{
        left: bounds.x,
        fontSize: theme.mantine.fontSizes.xl,
        color: tokens.color.scene.mutedForeground,
        ...motion.enter(frame, props.revealAtFrame ?? 1, { y: 0 }),
      }}
    >
      {props.footnote}
    </p>
  );
}
