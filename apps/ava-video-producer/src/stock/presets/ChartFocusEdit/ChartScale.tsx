import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { axisMaximum: number; refinement: number };
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
      <g
        data-minor-grid="plot"
        opacity={mix(refinement, tokens.alpha.guide, atomic.opacity["6"])}
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
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
            />
          );
        })}
      </g>
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
