import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./FoodSymbolShared/FoodSymbolShared.types";
import type { ReactNode } from "react";
/** A fruit with its stem, or a vegetable with its rib. */
export function ProduceSymbol({
  symbol,
}: Readonly<Pick<Props, "symbol">>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  if (symbol === "fruit") {
    return (
      <>
        <circle r={8} />
        <SketchedShape
          shape={{ kind: "path", d: "M0 -8 Q1 -13 6 -12" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.positive}
        />
      </>
    );
  }
  return symbol === "vegetables" ? (
    <>
      <path d="M-8 -2 Q0 -13 8 -2 L0 10 Z" />
      <SketchedShape
        shape={{ kind: "path", d: "M0 -10 V9" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.surface}
      />
    </>
  ) : undefined;
}
