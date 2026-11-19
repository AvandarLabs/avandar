import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";
/** The dash of the network boundary. */
const NETWORK_DASH = "6 6";
/**
 * Stable device and planner boundaries separate retained rows from messages.
 */
export function ExecutionBoundaries(): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
        strokeDasharray={NETWORK_DASH}
      />
    </g>
  );
}
