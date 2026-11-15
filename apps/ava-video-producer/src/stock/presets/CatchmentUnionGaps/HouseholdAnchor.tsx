import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  householdId: string;
  x: number;
  y: number;
  color: string;
  covered: boolean;
  progress: number;
};
/** Exact fixed coordinate anchors retain the selected gap rings. */
export function HouseholdAnchor({
  householdId,
  x,
  y,
  color,
  covered,
  progress,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <circle data-home-anchor={householdId} cx={x} cy={y} r={3} fill={color} />
      <circle
        data-gap-ring={householdId}
        cx={x}
        cy={y}
        r={8}
        fill="none"
        stroke={STOCK.orange}
        opacity={covered ? 0 : progress}
      />
    </g>
  );
}
