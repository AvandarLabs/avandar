import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./FoodSymbolShared/FoodSymbolShared.types";
import { ProduceSymbol } from "./ProduceSymbol";
import { StapleSymbol } from "./StapleSymbol";
import type { ReactNode } from "react";
/** Component-type silhouettes carry no portion or nutrition quantity. */
export function FoodSymbol({ symbol, color }: Readonly<Props>): ReactNode {
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g fill={color} stroke={color} strokeWidth={scales.stroke(1.3)}>
      <StapleSymbol symbol={symbol} />
      <ProduceSymbol symbol={symbol} />
      {symbol === "cup" ? (
        <>
          <path d="M-7 -9 H7 L5 9 H-5 Z" fill="none" />
          <path d="M7 -5 Q15 -5 9 4" fill="none" />
        </>
      ) : undefined}
    </g>
  );
}
