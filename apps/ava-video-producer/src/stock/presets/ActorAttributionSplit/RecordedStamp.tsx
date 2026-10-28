import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  eventId: string;
  accountLabel: string;
  x: number;
  y: number;
  color: string;
};
/** The permanent ledger imprint retains the recorded account label. */
export function RecordedStamp({
  eventId,
  accountLabel,
  x,
  y,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <g data-stamp-event={eventId} transform={`translate(${x} ${y})`}>
      <rect
        width={325}
        height={43}
        y={-9}
        rx={5}
        fill={STOCK.elevated}
        stroke={color}
      />
      <LabelSlots labels={[[accountLabel, 10, 7, 305, 12, 2]]} />
    </g>
  );
}
