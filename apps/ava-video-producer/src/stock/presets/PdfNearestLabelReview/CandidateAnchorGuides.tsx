import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";
type Props = { input: Input; index: number; frame: number };
/** Uniform page units retain the original Euclidean distance anchors. */
export function CandidateAnchorGuides({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const label = input.labels[index];
  const figureX = 100 + input.figure.x * 3,
    figureY = 170 + input.figure.y * 3;
  const distance = ramp(frame, 51, 44, EASE.inOut);
  const x = 100 + label.x * 3,
    y = 170 + label.y * 3;
  const color = index === 0 ? STOCK.cyan : STOCK.orange;
  return (
    <g opacity={ramp(frame, 13 + index * 2, 35)}>
      <line
        data-distance-guide={label.id}
        x1={figureX}
        y1={figureY}
        x2={mix(distance, figureX, x)}
        y2={mix(distance, figureY, y)}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={index === 0 ? undefined : "4 3"}
      />
      <circle
        data-label-anchor={label.id}
        cx={x}
        cy={y}
        r={6 + index * 4}
        fill="none"
        stroke={color}
      />
      <path
        data-label-callout={label.id}
        d={`M${x} ${y} H${478 + index * 14} V${225 + index * 95} H540`}
        fill="none"
        stroke={color}
        strokeOpacity={0.5}
        strokeDasharray={index === 0 ? "2 4" : "7 4"}
      />
    </g>
  );
}
