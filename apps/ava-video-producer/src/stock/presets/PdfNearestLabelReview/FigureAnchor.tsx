import { ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Frames the source token and its anchor take to appear. */
const REVEAL_FRAMES = 37;
/** The dash of the rail from the token to its page anchor. */
const RAIL_DASH = "2 5";
/** A separate literal-token rail connects to its exact page anchor. */
export function FigureAnchor({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const reveal = ramp(
    frame,
    13,
    motion.scale(REVEAL_FRAMES),
    motion.reveal.easing,
  );
  const figureX = 100 + input.figure.x * 3,
    figureY = 170 + input.figure.y * 3;
  return (
    <g data-source-token={input.figure.text} opacity={reveal}>
      <LiteralDataText value={input.figure.text} x={100} y={145} />
      <SketchedShape
        shape={{ kind: "path", d: `M100 153 H${figureX} V${figureY}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeDasharray={RAIL_DASH}
      />
      <circle
        data-source-figure="true"
        cx={figureX}
        cy={figureY}
        r={4}
        fill={accent}
      />
    </g>
  );
}
