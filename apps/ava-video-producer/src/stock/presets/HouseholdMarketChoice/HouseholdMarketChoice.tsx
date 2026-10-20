import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { MarketCheckout } from "./MarketCheckout";
import { MarketLabels } from "./MarketLabels";
import { MarketProduct } from "./MarketProduct";
import { MarketShopper } from "./MarketShopper";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";
/** Complete authored purchase and shared frame parameters. */
export type Props = GraphicProps & { input: Input };
/** Household selection moves chosen products, then pays their exact total. */
export function HouseholdMarketChoice({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <MarketLabels input={input} />
      <path
        d="M40 288 H922 M40 288 V304 M922 288 V304"
        stroke={STOCK.line}
        strokeWidth={3}
        fill="none"
      />
      <PersonGlyph x={790} y={414} size={52} role="worker" color={STOCK.cyan} />
      <path
        d="M285 399 L300 465 H553 L568 399 M302 399 Q426 320 550 399"
        stroke={accent}
        strokeWidth={2}
        fill="none"
      />
      {input.products.map((product, index) => (
        <MarketProduct
          key={product.id}
          input={input}
          frame={frame}
          index={index}
          accent={accent}
        />
      ))}
      <MarketShopper input={input} frame={frame} accent={accent} />
      <MarketCheckout input={input} frame={frame} accent={accent} />
    </g>
  );
}
