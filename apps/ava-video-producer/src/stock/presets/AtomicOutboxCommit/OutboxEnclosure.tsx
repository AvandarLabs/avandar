import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The transaction's outline, split by the boundary between its two stores. */
export function OutboxEnclosure(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={70}
        y={140}
        width={820}
        height={360}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M480 155 V470" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.boundary.join(" ")}
      />
    </>
  );
}
