import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

const COMPARISON_AT = 111;
const COMPARISON_FRAMES = 28;
/** Reference area and optional radius ratios use the same square-root scale. */
export function AreaLegend({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const ratio = input.sites[1].value / input.sites[0].value,
    radius = Math.sqrt(input.areaPerUnit / Math.PI);
  return (
    <g data-area-legend="true" data-area-per-unit={input.areaPerUnit}>
      <SketchedShape
        shape={{ kind: "circle", cx: 546, cy: 466, r: radius }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={hairline}
      />
      <LabelSlots
        labels={[
          [
            `1 ${input.unitLabel} = ${input.areaPerUnit} px²`,
            586,
            454,
            326,
            12,
            3,
          ],
        ]}
      />
      {input.showRadiusComparison ? (
        <g
          opacity={motion.ramp(
            frame,
            COMPARISON_AT,
            motion.scale(COMPARISON_FRAMES),
          )}
        >
          <SketchedShape
            data-reference-radius="true"
            shape={{ kind: "path", d: `M546 466 h${radius}` }}
            profile={sketch.shape}
            stroke={accent}
            strokeWidth={hairline}
          />
          <LabelSlots
            labels={[
              [
                `A₂/A₁ = ${ratio} · r₂/r₁ = ${Math.sqrt(ratio)}`,
                516,
                526,
                396,
                12,
                3,
              ],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
