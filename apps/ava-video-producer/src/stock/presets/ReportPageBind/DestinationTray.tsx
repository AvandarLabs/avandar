import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { label: string; frame: number; accent: string };
/** A named receiving tray denotes preparation for handoff. */
export function DestinationTray({
  label,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-destination="tray" opacity={ramp(frame, 104, 32)}>
      <path
        d="M64 544v34h832v-34M80 544h800"
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <FitText
        text={label}
        x={480}
        y={566}
        width={720}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        anchor="middle"
        color={accent}
      />
    </g>
  );
}
