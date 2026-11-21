import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The session area and the remaining and discarded trays. */
export function SessionFurniture(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={280}
        y={180}
        width={375}
        height={290}
        rx={scales.corner(24)}
        fill="none"
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M690 205 V280 H930 V205 M690 385 V460 H930 V385",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
    </>
  );
}
