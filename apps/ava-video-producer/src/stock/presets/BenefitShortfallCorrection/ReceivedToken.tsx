import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  paymentId: string;
  unitIndex: number;
  x: number;
  y: number;
  isOriginal: boolean;
  isHandling: boolean;
  accent: string;
};
/** Original solids and correction stripes remain visually distinct. */
export function ReceivedToken({
  paymentId,
  unitIndex,
  x,
  y,
  isOriginal,
  isHandling,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-unit-kind={isOriginal ? "original" : "correction"}
      data-unit={unitIndex}
    >
      <circle
        data-payment-token={paymentId}
        cx={x}
        cy={y}
        r={18}
        fill={isOriginal ? accent : STOCK.cyan}
      />
      {!isOriginal ? (
        <path
          d={`M${x - 9} ${y + 7} l16 -16 M${x - 2} ${y + 12} l13 -13`}
          stroke={STOCK.ground}
          strokeWidth={3}
        />
      ) : undefined}
      {isHandling ? (
        <path
          data-correction-hand={paymentId}
          d={`M740 160 H950 V${y - 18} L${x} ${y - 18}`}
          fill="none"
          stroke={STOCK.cyan}
          strokeWidth={3}
        />
      ) : undefined}
    </g>
  );
}
