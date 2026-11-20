import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../videoTheme/useVideoTheme";
import css from "../ContinuityScene/ContinuityScene.module.css";
import { ContinuityThesisEmphasis } from "./ContinuityThesisEmphasis";
import type { ContinuityBeat } from "../continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "thesis" }>;
  frame: number;
  accent: string;
};
/** Staggered statement with a single deterministic teaching underline. */
export function ContinuityThesis({ content, frame, accent }: Props): ReactNode {
  const thesis = useVideoProps("Thesis", {});
  const motion = useVideoMotion();
  return (
    <div className={css.continuityThesis}>
      {content.lines.map((line, index) => {
        return (
          <div
            className={css.continuityThesisLine}
            key={line}
            style={motion.enter(
              frame,
              index * motion.scale(thesis.lineStagger),
              {
                y: thesis.lineDistance,
                dur: motion.scale(thesis.lineDuration),
                easing: motion.curve(thesis.lineEasing),
              },
            )}
          >
            {line}
          </div>
        );
      })}
      <ContinuityThesisEmphasis
        emphasis={content.emphasis}
        frame={frame}
        accent={accent}
      />
    </div>
  );
}
