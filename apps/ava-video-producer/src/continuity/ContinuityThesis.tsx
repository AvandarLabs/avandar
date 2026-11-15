import { Underline } from "@remotion/rough-notation";
import { enter, ramp } from "../motion";
import { useContinuityAppearance } from "./ContinuityAppearanceContext";
import css from "./ContinuityScene.module.css";
import { useContinuityCopy } from "./useContinuityCopy";
import type { ContinuityBeat } from "./continuitySchema";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "thesis" }>;
  frame: number;
  accent: string;
};

/** Staggered statement with a single deterministic teaching underline. */
export function ContinuityThesis({ content, frame, accent }: Props) {
  const translate = useContinuityCopy();
  const { annotations, annotationRoughness } = useContinuityAppearance();
  return (
    <div className={css.continuityThesis}>
      {content.lines.map((line, index) => (
        <div
          className={css.continuityThesisLine}
          key={line}
          style={enter(frame, index * 24, { y: 16, dur: 24 })}
        >
          {translate(line)}
        </div>
      ))}
      <div className={css.continuityEmphasis}>
        <Underline
          disabled={!annotations}
          progress={ramp(frame, 95, 28)}
          color={accent}
          roughness={annotationRoughness}
          seed={4}
          strokeWidth={3}
        >
          {translate(content.emphasis)}
        </Underline>
      </div>
    </div>
  );
}
