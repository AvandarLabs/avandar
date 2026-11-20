import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/**
 * Stable device and planner boundaries separate retained rows from messages.
 */
export function ExecutionBoundaries(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-local-boundary="true"
        x={30}
        y={95}
        width={540}
        height={455}
        rx={scales.corner(tokens.corner.panel)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <StockRect
        data-remote-boundary="true"
        x={618}
        y={95}
        width={310}
        height={455}
        rx={scales.corner(tokens.corner.panel)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M594 90 V552" }}
        profile={tokens.sketch.shape}
        data-network-boundary="true"
        stroke={tokens.color.inactive}
        strokeDasharray={atomic.dash.long.join(" ")}
      />
    </g>
  );
}
