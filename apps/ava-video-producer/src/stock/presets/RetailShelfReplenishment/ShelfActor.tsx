import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { ReactNode } from "react";
type Props = {
  role: "retailer" | "shopper";
  x: number;
  y: number;
  handX: number;
  handY: number;
  accent: string;
};
/** Connected limbs follow pointing, ordering, loading and shopper handling. */
export function ShelfActor({
  role,
  x,
  y,
  handX,
  handY,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <PersonGlyph
        x={x}
        y={y}
        size={40}
        color={accent}
        role={role === "retailer" ? "worker" : "participant"}
      />
      <path
        data-retailer-arm={role === "retailer" ? "" : undefined}
        data-shopper-arm={role === "shopper" ? "" : undefined}
        d={`M${x} ${y} L${(x + handX) / 2} ${handY + 16} L${handX} ${handY}`}
        stroke={accent}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <circle
        data-retailer-hand={role === "retailer" ? "" : undefined}
        data-shopper-hand={role === "shopper" ? "" : undefined}
        cx={handX}
        cy={handY}
        r={3.5}
        fill={accent}
      />
    </g>
  );
}
