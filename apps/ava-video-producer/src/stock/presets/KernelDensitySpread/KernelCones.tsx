import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
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
const CONE_FILL_ALPHA = 0.04;
/** Weighted cones rise over fixed observations and change radius together. */
export function KernelCones({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
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
            <KernelCone
              pointId={point.id}
              center={center}
              radius={radius}
              height={height}
              accent={accent}
            />
          </g>
        ) : undefined;
      })}
    </g>
  );
}

/** One weighted cone over its observation, with its kernel's boundary. */
function KernelCone({
  pointId,
  center,
  radius,
  height,
  accent,
}: Readonly<{
  pointId: string;
  center: Readonly<{ cx: number; cy: number }>;
  radius: number;
  height: number;
  accent: string;
}>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { stroke, alpha, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <>
      <SketchedShape
        data-kernel-boundary={pointId}
        shape={{ kind: "circle", ...center, r: radius * 2.8 }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeOpacity={atomic.opacity["32"]}
        strokeWidth={hairline}
      />
      <SketchedShape
        data-cone={pointId}
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
    </>
  );
}
