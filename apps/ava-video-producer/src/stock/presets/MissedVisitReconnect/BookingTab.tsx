import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = {
  item: Input["cases"][number];
  index: number;
  y: number;
  frame: number;
  accent: string;
};
/** A booking tab travels to the calendar and folds its own corner. */
export function BookingTab({
  item,
  index,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 79 + index * 2, 14);
  const fold = mix(progress, 0, 14);
  return (
    <g
      data-booking={item.id}
      opacity={ramp(frame, 79 + index * 2, 8)}
      transform={`translate(${mix(progress, 310, 560)} ${y})`}
    >
      <path
        d={`M0 -14 h${74 - fold} l${fold} ${fold} V16 H0 Z M${74 - fold} -14 v${fold} h${fold}`}
        fill={STOCK.surface}
        stroke={accent}
      />
    </g>
  );
}
