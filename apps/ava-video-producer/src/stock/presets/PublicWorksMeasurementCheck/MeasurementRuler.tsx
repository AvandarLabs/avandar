import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A fixed eight-unit ruler preserves spatial scale across every input. */
export function MeasurementRuler(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "line", x1: 200, y1: 370, x2: 720, y2: 370 }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
      />
      {Array.from({ length: 9 }, (_, index) => {
        return (
          <g key={index}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: 200 + index * 65,
                y1: 365,
                x2: 200 + index * 65,
                y2: 375,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.inactive}
            />
          </g>
        );
      })}
    </g>
  );
}
