import { mix } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The paper growing its margins around the section. */
export function PagePaper({
  sectionId,
  margins,
}: Readonly<{ sectionId: string; margins: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-page-paper={sectionId}
      x={-16}
      y={-8}
      width={mix(margins, 740, 800)}
      height={mix(margins, 86, 136)}
      rx={scales.corner(tokens.corner.chip)}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
