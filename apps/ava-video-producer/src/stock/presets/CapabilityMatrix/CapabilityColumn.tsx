import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = {
  option: Input["options"][number];
  index: number;
  columnWidth: number;
  height: number;
};
/** One option heading aligns with its table column. */
export function CapabilityColumn({
  option,
  index,
  columnWidth,
  height,
}: Readonly<Props>): ReactNode {
  const x = 302 + columnWidth * index;
  const label = {
    text: option.label,
    x: x + columnWidth / 2,
    y: 108,
    width: columnWidth - 24,
    fontSize: 18 as const,
    maxLines: 3,
  };
  return (
    <g aria-label={option.label}>
      <FitText {...label} breakLongWords normalizeWhitespace anchor="middle" />
      <line x1={x} x2={x} y1={176} y2={176 + height} stroke={STOCK.line} />
    </g>
  );
}
