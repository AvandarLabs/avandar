import { Text } from "../../../graphics-common/Text";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeGridSceneFromInputAndFrame } from "../makeGridSceneFromInputAndFrame";
import { SourceGhosts } from "./SourceGhosts";
import type { Input } from "../SpatialGridBinning.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Moving count tokens are painted above cell shading and ledger outlines. */
export function GridTokens({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { points } = makeGridSceneFromInputAndFrame({ input, frame, motion });
  return (
    <g>
      {input.showPointGhosts ? <SourceGhosts points={points} /> : undefined}
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
