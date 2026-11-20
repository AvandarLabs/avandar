import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MarketCheckout } from "./MarketCheckout";
import { MarketLabels } from "./MarketLabels";
import { MarketProduct } from "./MarketProduct";
import { MarketScenery } from "./MarketScenery";
import { MarketShopper } from "./MarketShopper";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
      <MarketScenery accent={accent} />
      {input.products.map((product, index) => {
        return (
          <MarketProduct
            key={product.id}
            input={input}
            frame={frame}
            index={index}
            accent={accent}
          />
        );
      })}
      <MarketShopper input={input} frame={frame} accent={accent} />
      <MarketCheckout input={input} frame={frame} accent={accent} />
    </g>
  );
}
