import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MaterialBoundaryShared } from "./MaterialBoundaryShared/MaterialBoundaryShared";
import type { ReactNode } from "react";
/** The output assembly's own shell, appearing once parts are assembled. */
export function OutputShell({
  frame,
  isAppliance,
}: Readonly<{ frame: number; isAppliance: boolean }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-output-shell="physical"
      x={408}
      y={288}
      width={305}
      height={48}
      rx={scales.corner(
        isAppliance
          ? MaterialBoundaryShared.APPLIANCE_CORNER
          : MaterialBoundaryShared.MODULE_CORNER,
      )}
      fill="none"
      stroke={tokens.color.line}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      opacity={motion.reveal(frame, 108)}
    />
  );
}
