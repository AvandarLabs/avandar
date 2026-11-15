import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { LocalCountValue } from "./LocalCountValue";
import { ThresholdShutter } from "./ThresholdShutter";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";

type Props = {
  cell: Input["cells"][number];
  index: number;
  minimum: number;
  showLocalCounts: boolean;
  frame: number;
};
/** Complete local aggregates retain their counts beside the release gate. */
export function LocalAggregateCell({
  cell,
  index,
  minimum,
  showLocalCounts,
  frame,
}: Readonly<Props>): ReactNode {
  const x = 40 + (index % 2) * 190;
  const y = 170 + Math.floor(index / 2) * 100;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={170}
        height={88}
        rx={8}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <LabelSlots labels={[[cell.label, x + 12, y + 20, 146, 12, 3]]} />
      {showLocalCounts && cell.count !== null ? (
        <LocalCountValue count={cell.count} x={x} y={y} />
      ) : undefined}
      <ThresholdShutter
        cellId={cell.id}
        x={x}
        y={y}
        frame={frame}
        index={index}
        isSuppressed={
          cell.count !== null && cell.count > 0 && cell.count < minimum
        }
      />
    </g>
  );
}
