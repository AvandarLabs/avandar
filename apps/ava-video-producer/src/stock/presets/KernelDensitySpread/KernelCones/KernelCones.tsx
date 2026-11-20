import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getKernelSamplesFromInput } from "../getKernelSamplesFromInput";
import { KernelCone } from "./KernelCone";
import type { Input } from "../KernelDensitySpread.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const CONE_AT = 13;
const CONE_FRAMES = 34;
/** The frame the cones give way to the field unless they stay shown. */
const CONES_HIDE_AT = 106;
const CONE_HEIGHT_PER_WEIGHT = 12;
/** Weighted cones rise over fixed observations and change radius together. */
export function KernelCones({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { radius } = getKernelSamplesFromInput({ input, frame, motion });
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
