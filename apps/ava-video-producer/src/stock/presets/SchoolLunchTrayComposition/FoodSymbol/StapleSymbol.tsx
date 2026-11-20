import { FoodSymbolShared } from "./FoodSymbolShared/FoodSymbolShared";
import { type Props } from "./FoodSymbolShared/FoodSymbolShared.types";
import type { ReactNode } from "react";
/** Two grains, or two beans. */
export function StapleSymbol({
  symbol,
}: Readonly<Pick<Props, "symbol">>): ReactNode {
  if (symbol === "grain") {
    return (
      <>
        <ellipse
          cx={-4}
          cy={-3}
          rx={FoodSymbolShared.GRAIN_RADIUS_X}
          ry={FoodSymbolShared.GRAIN_RADIUS_Y}
        />
        <ellipse
          cx={4}
          cy={3}
          rx={FoodSymbolShared.GRAIN_RADIUS_X}
          ry={FoodSymbolShared.GRAIN_RADIUS_Y}
        />
      </>
    );
  }
  return symbol === "beans" ? (
    <>
      <path d="M-8 -4 Q0 -10 2 -3 Q4 4 -4 4 Q-10 3 -8 -4" />
      <path d="M1 4 Q7 -1 9 5 Q9 10 3 10 Z" />
    </>
  ) : undefined;
}
