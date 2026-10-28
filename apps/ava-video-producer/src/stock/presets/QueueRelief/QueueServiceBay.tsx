import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";
type Props = {
  slot: Input["serviceSlots"][number];
  index: number;
  expansion: number;
  accent: string;
};
/** A named closed outline expands to full usable service capacity. */
export function QueueServiceBay({
  slot,
  index,
  expansion,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-slot-id={slot.id}
        data-open={slot.initiallyOpen || expansion === 1}
        x={344}
        y={154 + index * 100}
        width={slot.initiallyOpen ? 272 : mix(expansion, 48, 272)}
        height={90}
        rx={6}
        fill={STOCK.surface}
        stroke={slot.initiallyOpen ? accent : STOCK.orange}
        strokeDasharray={
          slot.initiallyOpen || expansion === 1 ? undefined : "5 5"
        }
      />
      <FitText
        text={slot.label}
        x={356}
        y={174 + index * 100}
        width={248}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
