import { FoodSymbol } from "./FoodSymbol";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = {
  component: Input["plannedComponents"][number];
  frame: number;
  index: number;
  foodY: number;
  accent: string;
  isServed: boolean;
};
/** Served Food for the authored scene. */
export function ServedFood({
  component,
  frame,
  index,
  foodY,
  accent,
  isServed,
}: Readonly<Props>): ReactNode {
  return isServed && frame >= 36 + index * 12 ? (
    <g
      data-served-component={component.id}
      transform={`translate(-50 ${foodY})`}
    >
      <FoodSymbol symbol={component.symbol} color={accent} />
    </g>
  ) : undefined;
}
