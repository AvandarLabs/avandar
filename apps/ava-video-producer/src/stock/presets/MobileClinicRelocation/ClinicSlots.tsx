import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Every supplied appointment has one tab, never a duplicate booking glyph. */
export function ClinicSlots({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.slots.map((slot, index) => {
        const occupied = input.people.some(({ slotId }) => slotId === slot.id);
        return (
          <g key={slot.id} opacity={ramp(frame, 14 + index * 2, 12)}>
            <rect
              data-slot-id={slot.id}
              data-occupied={occupied}
              x={630}
              y={145 + index * 44}
              width={30}
              height={30}
              rx={4}
              fill={occupied ? accent : STOCK.surface}
              stroke={occupied ? accent : STOCK.muted}
              fillOpacity={occupied ? ramp(frame, 96, 17) : 1}
            />
            <FitText
              text={slot.label}
              x={680}
              y={162 + index * 44}
              width={240}
              fontSize={14}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </g>
  );
}
