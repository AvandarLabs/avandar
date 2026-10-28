import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";
type Props = {
  component: Input["plannedComponents"][number];
  frame: number;
  index: number;
  foodY: number;
  isServed: boolean;
};
/** Serving Utensil for the authored scene. */
export function ServingUtensil({
  component,
  frame,
  index,
  foodY,
  isServed,
}: Readonly<Props>): ReactNode {
  return isServed && frame >= 36 + index * 12 && frame < 50 + index * 12 ? (
    <g
      data-serving-utensil={component.id}
      transform={`translate(-50 ${foodY})`}
      opacity={1 - ramp(frame, 48 + index * 12, 2)}
    >
      <ellipse
        cx={0}
        cy={5}
        rx={12}
        ry={5}
        fill="none"
        stroke={STOCK.text}
        strokeWidth={2}
      />
      <path d="M0 10 V28" stroke={STOCK.text} strokeWidth={3} />
    </g>
  ) : undefined;
}
