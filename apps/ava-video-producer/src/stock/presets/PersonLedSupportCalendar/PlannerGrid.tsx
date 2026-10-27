import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { PlannerColumns } from "./PlannerColumns";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Fixed tabletop grid keeps all authored commitments in discrete cells. */
export function PlannerGrid({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={180}
        y={110}
        width={620}
        height={355}
        rx={18}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <PlannerColumns input={input} />
      {input.timeBands.map((band, row) => (
        <LabelSlots
          key={band.id}
          labels={[
            [
              band.label,
              62,
              244 + (row * 228) / input.timeBands.length,
              155,
              12,
              3,
            ],
          ]}
        />
      ))}
    </g>
  );
}
