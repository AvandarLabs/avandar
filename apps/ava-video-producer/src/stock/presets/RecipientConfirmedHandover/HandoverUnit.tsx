import { STOCK } from "../../stockPalette";
import { getHandoverPositionFromInputAndFrame } from "./getHandoverPositionFromInputAndFrame";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  contentIndex: number;
  unitIndex: number;
  accent: string;
};
const SYMBOLS: Record<"grain" | "blanket" | "soap" | "container", string> = {
  grain: "M0 6 V-8 M0 0 L-6 -6 M0 -3 L6 -9",
  blanket: "M-7 -8 H7 V8 H-7 Z M-3 -8 V8",
  soap: "M-8 -5 Q0 -10 8 -5 V6 Q0 10 -8 6 Z",
  container: "M-7 -5 H7 V9 H-7 Z M-4 -5 V-9 H4 V-5",
};
/** Every offered unit moves once or remains on the delivery table. */
export function HandoverUnit({
  input,
  frame,
  contentIndex,
  unitIndex,
  accent,
}: Readonly<Props>): ReactNode {
  const content = input.contents[contentIndex];
  const { x, y, travel } = getHandoverPositionFromInputAndFrame({
    input,
    frame,
    contentIndex,
    unitIndex,
  });
  return (
    <g
      data-good={content.id}
      data-unit={unitIndex}
      data-owner={travel === 1 ? "basket" : travel === 0 ? "delivery" : "mat"}
      data-x={x}
      data-y={y}
      transform={`translate(${x} ${y})`}
    >
      <rect
        x={-12}
        y={-14}
        width={24}
        height={28}
        rx={4}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={1.5}
      />
      <path d={SYMBOLS[content.symbol]} stroke={accent} fill="none" />
    </g>
  );
}
