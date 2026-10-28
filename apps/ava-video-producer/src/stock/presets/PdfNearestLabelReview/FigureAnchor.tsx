import { ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A separate literal-token rail connects to its exact page anchor. */
export function FigureAnchor({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const reveal = ramp(frame, 13, 37);
  const figureX = 100 + input.figure.x * 3,
    figureY = 170 + input.figure.y * 3;
  return (
    <g data-source-token={input.figure.text} opacity={reveal}>
      <LiteralDataText value={input.figure.text} x={100} y={145} />
      <path
        d={`M100 153 H${figureX} V${figureY}`}
        fill="none"
        stroke={STOCK.muted}
        strokeDasharray="2 5"
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
