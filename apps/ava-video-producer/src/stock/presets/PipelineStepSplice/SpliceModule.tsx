import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { getSpliceGeometryFromInputAndFrame } from "./getSpliceGeometryFromInputAndFrame";
import type { ReactNode } from "react";
type Props = {
  step: ReturnType<typeof getSpliceGeometryFromInputAndFrame>[number];
  index: number;
  frame: number;
  accent: string;
};
/**
 * A readable operation stays upright while traveling into its requested gap.
 */
export function SpliceModule({
  step,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-step={step.id}
      transform={`translate(${step.x} ${step.y})`}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <rect
        data-step-body={step.id}
        x={0}
        y={0}
        width={140}
        height={110}
        rx={5}
        fill={STOCK.surface}
        stroke={step.isInserted ? accent : STOCK.line}
        strokeWidth={step.isInserted ? 2 : 1}
      />
      <path
        d="M14 16h32"
        stroke={step.isInserted ? accent : STOCK.muted}
        strokeWidth={3}
      />
      <FitText
        text={step.label}
        x={70}
        y={38}
        width={134}
        anchor="middle"
        fontSize={14}
        maxLines={4}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
