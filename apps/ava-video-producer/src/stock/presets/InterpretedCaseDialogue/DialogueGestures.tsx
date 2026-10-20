import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { frame: number; accent: string };
/** Speaking and interpreting hands pause between the authored turns. */
export function DialogueGestures({
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const first = ramp(frame, 24, 6) * (1 - ramp(frame, 64, 6));
  const second = ramp(frame, 80, 6) * (1 - ramp(frame, 120, 6));
  return (
    <g>
      {" "}
      <path
        data-speaking-gesture="participant"
        d={`M210 485 L250 ${490 - first * 20}`}
        stroke={accent}
        strokeWidth={3}
      />
      <path
        data-speaking-gesture="worker"
        d={`M750 485 L710 ${490 - second * 20}`}
        stroke={accent}
        strokeWidth={3}
      />
      <path
        data-interpreter-gesture=""
        d={`M480 510 L450 ${510 - (first + second) * 14} M480 510 L510 ${510 - (first + second) * 14}`}
        stroke={STOCK.cyan}
        strokeWidth={3}
      />
    </g>
  );
}
