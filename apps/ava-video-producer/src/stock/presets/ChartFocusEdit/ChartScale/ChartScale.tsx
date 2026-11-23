import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ChartScaleMinorGrid } from "./ChartScaleMinorGrid";
import type { ReactNode } from "react";

type Props = {
  axisMaximum: number;
  refinement: number;
};

/** Grid refinement retains a common zero baseline and both scale endpoints. */
export function ChartScale({
  axisMaximum,
  refinement,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <ChartScaleMinorGrid
        refinement={refinement}
        atomic={atomic}
        tokens={tokens}
      />
      <g data-zero-baseline="fixed">
        <SketchedShape
          shape={{ kind: "path", d: "M344 146V534H744V146" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.hairline)}
        />
      </g>
      {[
        { value: 0, x: 344 },
        { value: axisMaximum, x: 744 },
      ].map(({ value, x }, index) => {
        return (
          <text
            key={index}
            x={x}
            y={555}
            fill={tokens.color.textMuted}
            fontSize={tokens.text.graphic.value.fontSize}
            fontFamily={tokens.text.graphic.value.fontFamily}
            fontWeight={tokens.text.graphic.value.fontWeight}
            textAnchor={index ? "end" : "start"}
          >
            {value}
          </text>
        );
      })}
    </g>
  );
}
