import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { MarketCheckout } from "./MarketCheckout";
import { MarketLabels } from "./MarketLabels";
import { MarketProduct } from "./MarketProduct";
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

/** The shelf, the retailer behind it, and the shopper's basket. */
function MarketScenery({ accent }: Readonly<{ accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M40 288 H922 M40 288 V304 M922 288 V304" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <PersonGlyph
        x={790}
        y={414}
        size={52}
        role="worker"
        color={tokens.color.accentAlt}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M285 399 L300 465 H553 L568 399 M302 399 Q426 320 550 399",
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
    </>
  );
}
