import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** Inputs for LampObject. */
type Props = { functioning: number; accent: string };

/** A desk lamp illuminates only after a functioning participant retest. */
export function LampObject({
  functioning,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d="M425 404 H565 M495 402 V284 L540 251 L570 281 L520 297 Z"
        fill={STOCK.surface}
        stroke={STOCK.muted}
        strokeWidth={5}
      />
      <path
        data-light="authored"
        d="M522 300 L440 388 H610 L565 295 Z"
        fill={STOCK.orange}
        opacity={functioning * 0.35}
      />
      <rect
        x={550}
        y={318}
        width={24}
        height={24}
        rx={4}
        fill={STOCK.surface}
        stroke={accent}
      />
    </g>
  );
}
