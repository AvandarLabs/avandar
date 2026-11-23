import { Motion } from "../../../motion";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  margins: number;
};
/** The upper paper margin meets the first section without a gap. */
export function ReportHeaderPaper({
  x,
  y,
  margins,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <StockRect
      data-header-paper="first-page"
      x={x - 16}
      y={14}
      width={Motion.mix({
        t: margins,
        from: 740,
        to: 800,
      })}
      height={y - 22}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
