import { mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";
type Props = { input: Input; index: number; frame: number };
/**
 * Source strings retain lexical forms, including the arriving contradiction.
 */
export function EvidenceSourceCell({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const value = input.values[index];
  const isLate = index === input.values.length - 1;
  const at = isLate ? 56 : 13 + index * 2;
  const arrival = ramp(frame, at, isLate ? 44 : 30);
  const y = 225 + index * 50 + (isLate ? mix(arrival, 16, 0) : 0);
  return frame >= at &&
    (frame < 101 || (frame >= 139 && input.showOriginalStrings)) ? (
    <g
      data-source-value={value}
      data-original-value={input.showOriginalStrings ? value : undefined}
      opacity={arrival}
    >
      <rect
        data-late-cell={isLate ? "" : undefined}
        x={64}
        y={y}
        width={330}
        height={42}
        fill="none"
        stroke={isLate ? STOCK.orange : STOCK.line}
      />
      <LiteralDataText value={value} x={88} y={y + 26} />
    </g>
  ) : undefined;
}
