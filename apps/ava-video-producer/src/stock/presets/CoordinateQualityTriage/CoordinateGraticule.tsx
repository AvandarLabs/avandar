import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";
/** Inclusive latitude and longitude ruler extents remain schematic. */
export function CoordinateGraticule(): ReactNode {
  const { color, stroke, alpha, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <g>
      <StockRect
        x={50}
        y={180}
        width={340}
        height={210}
        fill="none"
        stroke={color.line}
        strokeWidth={hairline}
      />
      {[0, 1, 2, 3, 4].map((index) => {
        return (
          <SketchedShape
            key={index}
            shape={{
              kind: "path",
              d: `M${50 + index * 85} 180 V390 M50 ${180 + index * 52.5} H390`,
            }}
            profile={sketch.shape}
            stroke={color.line}
            strokeOpacity={alpha.guide}
            strokeWidth={hairline}
          />
        );
      })}
      <Text x={50} y={410} role="data">
        −180
      </Text>
      <Text x={390} y={410} role="data" anchor="end">
        180
      </Text>
      <Text x={30} y={184} role="data">
        90
      </Text>
      <Text x={22} y={390} role="data">
        −90
      </Text>
    </g>
  );
}
