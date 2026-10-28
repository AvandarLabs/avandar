import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getRequestPositionFromInputAndFrame } from "./getRequestPositionFromInputAndFrame";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Disposition copy is visibly attached to its actual tray or work-slot target.
 */
export function RequestDisposition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const position = getRequestPositionFromInputAndFrame({ frame, input });
  return (
    <g opacity={ramp(frame, 77, 20)}>
      <g data-disposition-caption={input.request.placement}>
        <LabelSlots
          labels={[
            [
              input.request.placement === "defer"
                ? input.labels.deferred
                : input.labels.rescheduled,
              input.request.placement === "defer" ? 650 : 50,
              input.request.placement === "defer" ? 40 : 533,
              input.request.placement === "defer" ? 260 : 860,
              12,
              3,
            ],
          ]}
        />
      </g>
      {input.request.placement === "reschedule" ? (
        <path
          data-disposition-link={input.request.agreedSlotId ?? undefined}
          d={`M${position.x + position.width / 2} ${position.y + position.height} V518 H50 V522`}
          fill="none"
          stroke={accent}
        />
      ) : undefined}
      {input.request.placement === "defer" ? (
        <rect
          x={650}
          y={75}
          width={260}
          height={125}
          rx={8}
          fill="none"
          stroke={STOCK.orange}
          strokeDasharray="6 4"
        />
      ) : undefined}
    </g>
  );
}
