import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Draws the work surface and shared request arcs. */
export function CoordinationTableSurface({
  atomic,
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={330}
        y={135}
        width={300}
        height={355}
        rx={scales.corner(24)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M350 220 Q470 290 610 220 M350 390 Q470 330 610 390",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.open.join(" ")}
      />
    </>
  );
}
