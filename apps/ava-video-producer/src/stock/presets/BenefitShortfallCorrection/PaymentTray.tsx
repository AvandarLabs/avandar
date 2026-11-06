import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./BenefitShortfallCorrection.schema";
import type { ReactNode } from "react";

type Props = {
  payment: Input["payments"][number];
  frame: number;
  index: number;
  accent: string;
};
/**
 * The participant points to a stated position that originally lacked a token.
 */
export function PaymentTray({
  payment,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 306 + index * 120;
  const targetX = 330 + payment.receivedUnits * 68;
  return (
    <g>
      <path
        data-correction-envelope={payment.id}
        d={`M290 ${y + 81} h540 v23 H290 Z M290 ${y + 81} l270 16 l270 -16`}
        fill={STOCK.surface}
        stroke={STOCK.cyan}
      />
      <rect
        data-receiving-tray={payment.id}
        x={300}
        y={y - 5}
        width={568}
        height={66}
        rx={8}
        fill="none"
        stroke={STOCK.line}
      />
      <LabelSlots labels={[[payment.label, 48, y + 24, 220, 14, 3]]} />
      {frame >= 60 &&
      frame <= 70 &&
      payment.receivedUnits < payment.statedUnits ? (
        <path
          data-gap-point={payment.id}
          d={`M250 160 H280 V${y - 26} H${targetX} L${targetX} ${y + 24}`}
          fill="none"
          stroke={accent}
          strokeWidth={4}
        />
      ) : undefined}
    </g>
  );
}
