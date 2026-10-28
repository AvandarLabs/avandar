import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getDrillRecordLayoutFromInputAndFrame } from "./getDrillRecordLayoutFromInputAndFrame";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  record: Input["records"][number];
  accent: string;
};
/** Each supplied record moves once, then either occupies detail or recedes. */
export function DrillRecord({
  frame,
  input,
  record,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, width, height, isDetail, opacity, isSettled } =
    getDrillRecordLayoutFromInputAndFrame({ frame, input, record });
  if (opacity === 0) {
    return undefined;
  }
  return (
    <g opacity={opacity}>
      <rect
        data-record-id={record.id}
        data-detail-id={isDetail && isSettled ? record.id : undefined}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={STOCK.elevated}
        stroke={isDetail ? accent : STOCK.line}
      />
      <FitText
        text={record.label}
        x={x + 4}
        y={y + 17}
        width={width - 8}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
