import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { StatementContext } from "./StatementContext";
import type { Input } from "./QualifyApparentConflict.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  statement: Input["statements"][number];
  index: number;
  placement: Input["contextPlacement"];
};
/** The unchanged claim moves outward into its own labeled context region. */
export function ContextStatement({
  frame,
  accent,
  statement,
  index,
  placement,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const arrival = motion.ramp(
    frame,
    12 + index * motion.scaleStagger(6),
    motion.hero,
  );
  const split = motion.ramp(frame, 48, motion.scale(36), motion.travel.easing);
  const x =
    mix(split, index ? 680 : 280, index ? 710 : 250) +
    mix(arrival, index ? 14 : -14, 0);
  const contextY = placement === "above" ? 145 : 340;
  return (
    <g
      data-statement={statement.id}
      opacity={arrival}
      transform={`translate(${x} 0)`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M-180 316 H180" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <FitText
        text={statement.claim}
        x={0}
        y={230}
        width={360}
        fontSize={20}
        maxLines={4}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <StatementContext {...{ frame, accent, statement, index, contextY }} />
    </g>
  );
}
