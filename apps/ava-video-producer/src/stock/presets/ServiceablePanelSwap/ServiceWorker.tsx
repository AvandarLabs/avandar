import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { hand: { x: number; y: number } };
/**
 * Worker geometry maintains contact with the active latch or carried module.
 */
export function ServiceWorker({ hand }: Readonly<Props>): ReactNode {
  return (
    <g>
      <PersonGlyph
        x={hand.x + 22}
        y={hand.y + 62}
        role="participant"
        color={STOCK.orange}
      />
      <path
        data-service-arm="true"
        d={`M${hand.x + 22} ${hand.y + 62} L${hand.x + 25} ${hand.y + 20} L${hand.x} ${hand.y}`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      <circle
        data-service-hand="true"
        cx={hand.x}
        cy={hand.y}
        r={5}
        fill={STOCK.orange}
      />
    </g>
  );
}
