import { STOCK, type GraphicProps } from "../../graphics-common";
import { getShelfUnitsFromInputAndFrame } from "./getShelfUnitsFromInputAndFrame";
import { DEFAULT_INPUT } from "./RetailShelfReplenishment.fixtures";
import { ShelfActors } from "./ShelfActors";
import { ShelfCarrier } from "./ShelfCarrier";
import { ShelfLabels } from "./ShelfLabels";
import { ShelfOrder } from "./ShelfOrder";
import { ShelfStructure } from "./ShelfStructure";
import { ShelfUnit } from "./ShelfUnit";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Exact replenishment and shopper selection, without duplicated product units.
 */
export function RetailShelfReplenishment({
  frame,
  accent,
  input = DEFAULT_INPUT,
}: Readonly<Props>): ReactNode {
  const units = getShelfUnitsFromInputAndFrame({ input, frame });
  const shelfQuantities = input.goods.map(
    (good) =>
      units.filter((unit) => unit.good.id === good.id && unit.owner === "shelf")
        .length,
  );
  return (
    <g color={STOCK.text}>
      <ShelfStructure input={input} />
      <ShelfCarrier input={input} frame={frame} accent={accent} />
      <path
        d="M700 463 L710 498 H830 L840 463 M715 463 Q770 428 825 463"
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <ShelfOrder input={input} frame={frame} />
      {units.map((unit) => (
        <ShelfUnit
          key={`${unit.good.id}:${unit.unitIndex}`}
          {...unit}
          accent={accent}
        />
      ))}
      <ShelfActors input={input} frame={frame} accent={accent} />
      <ShelfLabels input={input} shelfQuantities={shelfQuantities} />
    </g>
  );
}
