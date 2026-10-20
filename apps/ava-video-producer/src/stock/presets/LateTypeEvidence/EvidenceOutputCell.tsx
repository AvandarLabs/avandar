import { mix, ramp, EASE } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  background: string;
};
/**
 * Intact strings travel into retained output slots under either type policy.
 */
export function EvidenceOutputCell({
  input,
  index,
  frame,
  accent,
  background,
}: Readonly<Props>): ReactNode {
  const value = input.values[index];
  const progress = ramp(frame, 101 + index * 2, 28, EASE.inOut);
  const x = mix(progress, 88, 564),
    y = 225 + index * 50;
  return frame >= 101 ? (
    <g data-output-value={value} x={x} y={y + 26}>
      <rect
        x={x - 24}
        y={y}
        width={330}
        height={42}
        fill={background}
        stroke={index === input.values.length - 1 ? STOCK.orange : accent}
      />
      <LiteralDataText value={value} x={x} y={y + 26} />
    </g>
  ) : undefined;
}
