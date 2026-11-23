import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  sectionId: string;
  margins: number;
};
/** The paper growing its margins around the section. */
export function PagePaper({ sectionId, margins }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-page-paper={sectionId}
      x={-16}
      y={-8}
      width={Motion.mix({
        t: margins,
        from: 740,
        to: 800,
      })}
      height={Motion.mix({
        t: margins,
        from: 86,
        to: 136,
      })}
      rx={scales.corner(tokens.corner.chip)}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
