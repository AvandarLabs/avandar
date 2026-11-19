import { Underline } from "@remotion/rough-notation";
import { enter, ramp } from "../motion";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import { useContinuityAppearance } from "./ContinuityAppearanceContext";
import css from "./ContinuityScene.module.css";
import type { ContinuityBeat } from "./continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "thesis" }>;
  frame: number;
  accent: string;
};

const UNDERLINE_CUE = 95;

/** Staggered statement with a single deterministic teaching underline. */
export function ContinuityThesis({ content, frame, accent }: Props): ReactNode {
  const { annotations } = useContinuityAppearance();
  const { sketch } = useVideoTokens();
  const thesis = useVideoProps("Thesis", {});
  const underline = useVideoProps("Underline", {});
  const motion = useVideoMotion();
  return (
    <div className={css.continuityThesis}>
      {content.lines.map((line, index) => {
        return (
          <div
            className={css.continuityThesisLine}
            key={line}
            style={enter(frame, index * motion.scale(thesis.lineStagger), {
              y: thesis.lineDistance,
              dur: motion.scale(thesis.lineDuration),
              easing: motion.curve(thesis.lineEasing),
            })}
          >
            {line}
          </div>
        );
      })}
      <div className={css.continuityEmphasis}>
        <Underline
          disabled={!annotations}
          progress={ramp(frame, UNDERLINE_CUE, motion.scale(underline.drawIn))}
          color={accent}
          roughness={sketch.annotation.roughness}
          seed={underline.seed}
          strokeWidth={underline.strokeWidth}
        >
          {content.emphasis}
        </Underline>
      </div>
    </div>
  );
}
