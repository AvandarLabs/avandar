import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * The same visibly unfinished document or assembly remains at its owner's desk.
 */
export function SupportWorktable({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 16, 12)}>
      <LabelSlots labels={[[input.task.label, 320, 238, 290, 16, 3]]} />
      <rect
        data-unfinished-task={input.task.kind}
        data-owner={input.people.requester}
        x={330}
        y={310}
        width={240}
        height={55}
        rx={3}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      {input.task.kind === "document" ? (
        <path
          d="M350 325 h115 M350 340 h75 M480 340 h65"
          stroke={STOCK.muted}
          strokeDasharray="6 6"
          fill="none"
        />
      ) : (
        <path
          d="M355 325 h60 v25 h-60 Z M475 325 h65 v25 h-65 Z M415 338 h60"
          stroke={STOCK.muted}
          strokeDasharray="5 5"
          fill="none"
        />
      )}
      <path
        d="M300 370 H640 V388 H300 Z M320 388 V425 M620 388 V425"
        stroke={STOCK.line}
        strokeWidth={3}
        fill={STOCK.surface}
      />
      <path
        d="M205 365 v42 h55 v-42 M215 407 v18 M250 407 v18"
        stroke={accent}
        strokeWidth={3}
        fill="none"
      />
    </g>
  );
}
