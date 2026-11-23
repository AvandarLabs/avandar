import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type ParentProps = {
  axisMaximum: number;
  refinement: number;
};

type Props = {
  refinement: Readonly<ParentProps>["refinement"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the chart scale minor grid in authored paint order. */
export function ChartScaleMinorGrid(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-minor-grid="plot"
      opacity={Motion.mix({
        t: options.refinement,
        from: options.tokens.alpha.guide,
        to: options.atomic.opacity["6"],
      })}
    >
      {[1, 2, 3, 4].map((index) => {
        return (
          <SketchedShape
            key={index}
            shape={{
              kind: "line",
              x1: 344 + index * 80,
              x2: 344 + index * 80,
              y1: 146,
              y2: 524,
            }}
            profile={options.tokens.sketch.shape}
            stroke={options.tokens.color.line}
          />
        );
      })}
    </g>
  );
}
