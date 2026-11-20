import { FitText } from "../../../primitives/FitText/FitText";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./ContrastAlternativeShared.types";
import type { ReactNode } from "react";
/** One alternative's panel with its label at a fixed size. */
export function AlternativePanel({
  alternative,
  index,
  accent,
}: Readonly<Omit<Props, "frame">>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const panel = {
    x: 48 + index * 512,
    y: 146,
    width: 352,
    height: 408,
    rx: scales.corner(tokens.corner.panel),
  };
  const label = {
    text: alternative.label,
    x: 224 + index * 512,
    y: 178,
    width: 312,
    fontSize: 20 as const,
    maxLines: 3,
  };
  return (
    <>
      <StockRect
        {...panel}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <g aria-label={alternative.label}>
        <FitText
          {...label}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
          color={index ? tokens.color.positive : accent}
        />
      </g>
    </>
  );
}
