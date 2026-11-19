import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeGridSceneFromInputAndFrame } from "./makeGridSceneFromInputAndFrame";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Moving count tokens are painted above cell shading and ledger outlines. */
export function GridTokens({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { color, stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const { points } = makeGridSceneFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {input.showPointGhosts
        ? points.map((point) => {
            return (
              <circle
                key={point.id}
                data-source-ghost={point.id}
                cx={point.sourceX}
                cy={point.sourceY}
                r={4}
                fill={color.inactive}
                opacity={atomic.opacity["35"]}
              />
            );
          })
        : undefined}
      {points.map((point) => {
        return (
          <g key={point.id}>
            <SketchedShape
              data-count-token={point.id}
              data-token-cell={point.cell}
              shape={{ kind: "circle", cx: point.x, cy: point.y, r: 8.5 }}
              profile={sketch.shape}
              fill={accent}
              fillOpacity={atomic.opacity["20"]}
              stroke={accent}
              strokeWidth={shapes.stroke(stroke.hairline)}
            />
            <Text role="data" x={point.x} y={point.y + 4} anchor="middle">
              {point.index + 1}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
