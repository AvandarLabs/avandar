import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ExpectedSheetShared } from "./ExpectedSheetShared";
import type { ReactNode } from "react";

type Props = { isHinge: boolean; scale: number; accent: string };

/** The expected sheet itself, folded flat on its hinge until it registers. */
export function HingedSheet({
  isHinge,
  scale,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-hinge={isHinge} transform={`matrix(1 0 0 ${scale} 0 0)`}>
      <StockRect
        width={390}
        height={39}
        rx={scales.corner(ExpectedSheetShared.SHEET_CORNER)}
        fill={accent}
        fillOpacity={scales.wash(atomic.opacity["6"])}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
