import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  index: number;
  railY: number;
  accent: string;
  selected: boolean;
};
/**
 * Fixed roster keys keep close or coincident site identities separately
 * legible.
 */
export function SiteKey({
  index,
  railY,
  accent,
  selected,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <line
        x1={638}
        x2={638}
        y1={railY + 8}
        y2={railY}
        stroke={selected ? accent : STOCK.muted}
      />
      <circle
        cx={638}
        cy={railY}
        r={9}
        fill={STOCK.surface}
        stroke={selected ? accent : STOCK.muted}
      />
      <text
        x={638}
        y={railY + 4}
        fill={STOCK.text}
        fontSize={12}
        textAnchor="middle"
      >
        {index + 1}
      </text>
    </g>
  );
}
