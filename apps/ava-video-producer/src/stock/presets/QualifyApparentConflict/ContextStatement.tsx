import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { StatementContext } from "./StatementContext";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { arrival, x } = _getStatementMotion({ frame, index, motion });
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
/** A statement arriving inward, then splitting outward from its partner. */
function _getStatementMotion({
  frame,
  index,
  motion,
}: Readonly<{
  frame: number;
  index: number;
  motion: VideoMotion;
}>) {
  const arrival = motion.ramp(
    frame,
    12 + index * motion.scaleStagger(6),
    motion.hero,
  );
  const split = motion.ramp(frame, 48, motion.scale(36), motion.travel.easing);
  return {
    arrival,
    x:
      Motion.mix({
        t: split,
        from: index ? 680 : 280,
        to: index ? 710 : 250,
      }) +
      Motion.mix({
        t: arrival,
        from: index ? 14 : -14,
        to: 0,
      }),
  };
}
