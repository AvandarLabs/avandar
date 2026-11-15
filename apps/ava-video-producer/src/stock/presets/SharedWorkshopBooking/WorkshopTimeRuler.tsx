import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
/** Inputs for WorkshopTimeRuler. */
type Props = { input: Input };

/** Discrete equal-width authored slots do not infer duration. */
export function WorkshopTimeRuler({ input }: Readonly<Props>): ReactNode {
  const slotWidth = 540 / input.timeSlots.length;
  return (
    <g>
      {" "}
      {input.timeSlots.map((slot, index) => (
        <g key={slot.id}>
          <path
            d={`M${390 + index * slotWidth} 490 V500 H${390 + (index + 1) * slotWidth} V490`}
            fill="none"
            stroke={STOCK.muted}
          />
          <LabelSlots
            labels={[
              [slot.label, 395 + index * slotWidth, 515, slotWidth - 15, 12, 5],
            ]}
          />
        </g>
      ))}
    </g>
  );
}
