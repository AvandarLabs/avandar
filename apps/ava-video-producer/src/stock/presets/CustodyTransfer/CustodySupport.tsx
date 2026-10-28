import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  recipient: boolean;
  accepted: boolean;
  accent: string;
};
/** A bracket touches the object until its responsibility can safely release. */
export function CustodySupport({
  frame,
  recipient,
  accepted,
  accent,
}: Readonly<Props>): ReactNode {
  const contact = ramp(frame, 36, 24, EASE.inOut);
  const withdraw = accepted ? ramp(frame, 100, 20, EASE.inOut) : 0;
  const color = recipient ? accent : STOCK.cyan;
  const line = {
    x1: recipient ? mix(contact, 720, 480) : 240,
    x2: recipient ? 720 : mix(withdraw, 480, 240),
    y1: 376,
    y2: 376,
    stroke: color,
    strokeWidth: 8,
    strokeLinecap: "round" as const,
  };
  return (
    <g opacity={ramp(frame, recipient ? 16 : 12, 12)}>
      <path
        d={recipient ? "M880 260 V376 H720" : "M180 260 V376 H288"}
        fill="none"
        stroke={color}
        strokeWidth={6}
      />
      <line
        data-sender-support={recipient ? undefined : "sender"}
        data-recipient-support={recipient ? "recipient" : undefined}
        {...line}
      />
    </g>
  );
}
