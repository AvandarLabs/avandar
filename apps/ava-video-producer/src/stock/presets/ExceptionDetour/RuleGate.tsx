import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { StandardOutcome } from "./StandardOutcome";
import type { Props } from "./ExceptionDetour";
import type { ReactNode } from "react";
/** The normal rule stays complete while a side latch opens for one case. */
export function RuleGate({ frame, accent, input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const emphasis = scales.stroke(tokens.stroke.emphasis);
  const side = input.detourSide === "above" ? -1 : 1;
  return (
    <g opacity={ramp(frame, 12, motion.hero, motion.reveal.easing)}>
      <RuleLabel text={input.rule.label} />
      <g data-standard-route="true">
        <SketchedShape
          shape={{ kind: "path", d: "M100 300 H880" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={emphasis}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: "M420 250 V350" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={emphasis}
      />
      <SideLatch frame={frame} side={side} />
      <StandardOutcome input={input} />
      {input.showStandardReference ? (
        <circle
          data-standard-reference="true"
          cx={865}
          cy={300}
          r={7}
          fill={tokens.color.inactive}
        />
      ) : null}
    </g>
  );
}

function RuleLabel({ text }: Readonly<{ text: string }>): ReactNode {
  return (
    <FitText
      text={text}
      x={480}
      y={50}
      width={840}
      fontSize={24}
      maxLines={3}
      anchor="middle"
      breakLongWords
      normalizeWhitespace
    />
  );
}

/** The latch that swings open to the detour side for the exception. */
function SideLatch({
  frame,
  side,
}: Readonly<{ frame: number; side: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const opening = motion.reveal(frame, 48);
  return (
    <g
      data-side-latch="true"
      transform={`rotate(${mix(opening, 0, side * 62)} 420 300)`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M420 300 H462" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </g>
  );
}
