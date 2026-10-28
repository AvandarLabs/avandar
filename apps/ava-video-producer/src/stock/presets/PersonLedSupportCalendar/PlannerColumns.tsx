import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Day headings remain outside the participant's handling corridor. */
export function PlannerColumns({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.days.map((day, column) => (
        <g key={day.id}>
          <LabelSlots
            labels={[
              [
                day.label,
                248 + (column * 540) / input.days.length,
                134,
                540 / input.days.length - 16,
                12,
                4,
              ],
            ]}
          />
          {input.timeBands.map((band, row) => (
            <rect
              key={band.id}
              data-planner-cell={`${column},${row}`}
              x={240 + (column * 540) / input.days.length}
              y={214 + (row * 228) / input.timeBands.length}
              width={540 / input.days.length}
              height={228 / input.timeBands.length}
              fill="none"
              stroke={STOCK.line}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
