import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  siteId: string;
  x: number;
  y: number;
  lift: number;
  accent: string;
  selected: boolean;
};
/**
 * A selected marker rises on a short stem above its unchanged eligible anchor.
 */
export function SiteAnchor({
  siteId,
  x,
  y,
  lift,
  accent,
  selected,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <circle
        data-site-anchor={siteId}
        cx={x}
        cy={y}
        r={3}
        fill={STOCK.muted}
      />
      <line x1={x} y1={y} x2={x} y2={y - lift} stroke={accent} />
      <circle
        data-raised-site={siteId}
        cx={x}
        cy={y - lift}
        r={selected ? 5 : 3}
        fill={selected ? accent : STOCK.muted}
      />
    </g>
  );
}
