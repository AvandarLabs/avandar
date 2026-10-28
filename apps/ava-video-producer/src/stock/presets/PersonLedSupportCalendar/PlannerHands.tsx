import { STOCK } from "../../stockPalette";
import { getPlannerHandsFromInputAndFrame } from "./getPlannerHandsFromInputAndFrame";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Articulated hands maintain actual contact with the moving appointment. */
export function PlannerHands({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { participant, worker } = getPlannerHandsFromInputAndFrame({
    input,
    frame,
  });
  return (
    <g>
      <path
        data-participant-arm=""
        d={`M120 136 L160 191 L ${participant.x} ${participant.y}`}
        fill="none"
        stroke={accent}
        strokeWidth={4}
      />
      <path
        data-worker-arm=""
        d={`M850 136 L815 191 L ${worker.x} ${worker.y}`}
        fill="none"
        stroke={STOCK.cyan}
        strokeWidth={4}
      />
      <circle
        data-participant-hand=""
        cx={participant.x}
        cy={participant.y}
        r={6}
        fill={accent}
      />
      <circle
        data-worker-hand=""
        cx={worker.x}
        cy={worker.y}
        r={6}
        fill={STOCK.cyan}
      />
    </g>
  );
}
