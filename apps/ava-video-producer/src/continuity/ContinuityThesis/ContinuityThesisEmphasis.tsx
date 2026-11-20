import { Underline } from "@remotion/rough-notation";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps, useVideoTokens } from "../../videoTheme/useVideoTheme";
import { useContinuityAppearance } from "../ContinuityAppearanceContext";
import css from "../ContinuityScene/ContinuityScene.module.css";
import { ContinuityThesisShared } from "./ContinuityThesisShared/ContinuityThesisShared";
import type { ReactNode } from "react";
/** The thesis emphasis with its deterministic teaching underline. */
export function ContinuityThesisEmphasis({
  emphasis,
  frame,
  accent,
}: Readonly<{ emphasis: string; frame: number; accent: string }>): ReactNode {
  const { annotations } = useContinuityAppearance();
  const { sketch } = useVideoTokens();
  const underline = useVideoProps("Underline", {});
  const motion = useVideoMotion();
  return (
    <div className={css.continuityEmphasis}>
      <Underline
        disabled={!annotations}
        progress={motion.ramp(
          frame,
          ContinuityThesisShared.UNDERLINE_CUE,
          motion.scale(underline.drawIn),
          motion.reveal.easing,
        )}
        color={accent}
        roughness={sketch.annotation.roughness}
        seed={underline.seed}
        strokeWidth={underline.strokeWidth}
      >
        {emphasis}
      </Underline>
    </div>
  );
}
