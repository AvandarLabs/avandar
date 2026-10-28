import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getShopperPoseFromInputAndFrame } from "./getShopperPoseFromInputAndFrame";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; total: number };

/**
 * Authored tender stays in the shopper's free hand, then crosses below the
 * basket.
 */
export function MarketTender({
  input,
  frame,
  accent,
  total,
}: Readonly<Props>): ReactNode {
  const shopper = getShopperPoseFromInputAndFrame({
    input,
    frame: Math.min(frame, 108),
  });
  const payment = ramp(frame, 108, 18, EASE.inOut);
  const x = mix(Math.max(0, payment * 2 - 1), shopper.x + 45, 790);
  const y = mix(Math.min(1, payment * 2), shopper.y + 10, 484);
  return (
    <g
      data-tender={input.tender}
      data-x={x}
      data-owner={frame >= 126 ? "retailer" : "shopper"}
      transform={`translate(${x} ${y})`}
    >
      <path
        d={
          input.tender === "cash"
            ? "M-33 -15 H33 V15 H-33 Z M-27 -10 H27 V10 H-27 Z"
            : "M-33 -15 H33 V-5 Q22 0 33 5 V15 H-33 V5 Q-22 0 -33 -5 Z"
        }
        fill={STOCK.surface}
        stroke={accent}
      />
      <text x={0} y={5} fontSize={14} fill={accent} textAnchor="middle">
        {total}
      </text>
    </g>
  );
}
