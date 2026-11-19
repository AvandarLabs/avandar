import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getKernelSamplesFromInput } from "./getKernelSamplesFromInput";
import type { Input } from "./KernelDensitySpread.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

const CONE_AT = 13;
const CONE_FRAMES = 34;
/** The frame the cones give way to the field unless they stay shown. */
const CONES_HIDE_AT = 106;
const CONE_HEIGHT_PER_WEIGHT = 12;
const BOUNDARY_ALPHA = 0.32;
const CONE_FILL_ALPHA = 0.04;
/** Weighted cones rise over fixed observations and change radius together. */
export function KernelCones({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { stroke, alpha, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const { radius } = getKernelSamplesFromInput({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {input.points.map((point, index) => {
        const rise = motion.ramp(
          frame,
          CONE_AT + index * motion.stagger.list,
          motion.scale(CONE_FRAMES),
        );
        const height = point.weight * CONE_HEIGHT_PER_WEIGHT * rise;
        const center = { cx: 180 + point.x * 2.8, cy: 200 + point.y * 2.8 };
        return frame < CONES_HIDE_AT || input.showKernels ? (
          <g key={point.id} opacity={rise}>
            <SketchedShape
              data-kernel-boundary={point.id}
              shape={{ kind: "circle", ...center, r: radius * 2.8 }}
              profile={sketch.shape}
              fill="none"
              stroke={accent}
              strokeOpacity={BOUNDARY_ALPHA}
              strokeWidth={hairline}
            />
            <SketchedShape
              data-cone={point.id}
              shape={{
                kind: "path",
                d: `M ${center.cx - radius * 2.8} ${center.cy} L ${center.cx} ${center.cy - height} L ${center.cx + radius * 2.8} ${center.cy} Z`,
              }}
              profile={sketch.shape}
              fill={accent}
              fillOpacity={shapes.wash(CONE_FILL_ALPHA)}
              stroke={accent}
              strokeOpacity={alpha.dimmed}
              strokeWidth={hairline}
            />
          </g>
        ) : undefined;
      })}
    </g>
  );
}
