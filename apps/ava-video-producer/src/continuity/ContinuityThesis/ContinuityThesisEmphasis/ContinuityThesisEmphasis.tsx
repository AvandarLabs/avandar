import { Underline } from "@remotion/rough-notation";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import {
  useVideoProps,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import { useContinuityAppearance } from "../../ContinuityAppearanceContext/useContinuityAppearance";
import { ContinuityThesisShared } from "../ContinuityThesisShared";
import css from "./ContinuityThesisEmphasis.module.css";
import type { ReactNode } from "react";

type Props = {
  emphasis: string;
  frame: number;
  accent: string;
};
/** The thesis emphasis with its deterministic teaching underline. */
export function ContinuityThesisEmphasis({
  emphasis,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { annotations } = useContinuityAppearance();
  const { sketch } = useVideoTokens();
  const underline = useVideoProps({
    name: "Underline",
    props: {},
  });
  const motion = useVideoMotion();
  return (
    <div className={css.continuityThesisEmphasisRoot}>
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
