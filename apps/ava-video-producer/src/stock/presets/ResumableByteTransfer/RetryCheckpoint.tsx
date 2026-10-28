import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { label: string; checkpoint: number; frame: number };
/** A complete bounded caption connects to the exact acknowledged byte. */
export function RetryCheckpoint({
  label,
  checkpoint,
  frame,
}: Readonly<Props>): ReactNode {
  const captionX = Math.max(84, Math.min(516, checkpoint - 180));
  return (
    <g opacity={ramp(frame, 56, 10)}>
      <path
        data-checkpoint-line="true"
        d={`M${checkpoint} 145 V444`}
        stroke={STOCK.orange}
        strokeDasharray="4 6"
      />
      <LabelSlots labels={[[label, captionX, 90, 360, 16, 3]]} />
      <path
        data-retry-caption-link="true"
        d={`M${captionX} 142 H${checkpoint} V151`}
        stroke={STOCK.orange}
        strokeWidth={1.5}
        fill="none"
      />
      <circle cx={checkpoint} cy={151} r={2} fill={STOCK.orange} />
    </g>
  );
}
