import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { horizontal: boolean; allReady: boolean; frame: number };
const GATE: { stroke: "#f0ba83"; strokeWidth: number } = {
  stroke: STOCK.orange,
  strokeWidth: 5,
};
/** Two solid gate sections separate to clear the full result's passage. */
export function ReadinessGate({
  horizontal,
  allReady,
  frame,
}: Readonly<Props>): ReactNode {
  const opening = allReady ? ramp(frame, 122, 8, EASE.inOut) : 0;
  const halfGap = opening * (horizontal ? 40 : 132);
  const before = horizontal
    ? { x1: 650, x2: 650, y1: 110, y2: 500 - halfGap }
    : { x1: 12, x2: 150 - halfGap, y1: 400, y2: 400 };
  const after = horizontal
    ? { x1: 650, x2: 650, y1: 500 + halfGap, y2: 548 }
    : { x1: 150 + halfGap, x2: 930, y1: 400, y2: 400 };
  const hinge = {
    cx: horizontal ? 650 : mix(opening, 150, 18),
    cy: horizontal ? mix(opening, 500, 460) : 400,
    r: 4,
    fill: STOCK.orange,
  };
  return (
    <g opacity={ramp(frame, 20, 12)}>
      <line data-gate="before" {...GATE} {...before} />
      <line data-gate="after" {...GATE} {...after} />
      <circle {...hinge} />
    </g>
  );
}
