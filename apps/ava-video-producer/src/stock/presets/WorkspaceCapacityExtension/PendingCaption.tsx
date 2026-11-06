import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { ReactNode } from "react";

type Props = {
  label: string;
  requestX: number;
  requestY: number;
  accent: string;
};
/**
 * Pending copy stays below the tray and connects to the moving request group.
 */
export function PendingCaption({
  label,
  requestX,
  requestY,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots labels={[[label, 60, 438, requestX - 84, 12, 7]]} />
      <path
        data-pending-link=""
        d={`M${requestX - 16} 438 H${requestX - 6} V${requestY + 66} H${requestX}`}
        fill="none"
        stroke={accent}
        strokeOpacity={0.65}
      />
    </g>
  );
}
