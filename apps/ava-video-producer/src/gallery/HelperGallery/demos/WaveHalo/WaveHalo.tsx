import { Motion } from "../../../../motion";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { DemoTheme } from "../DemoTheme";
import type { ReactNode } from "react";

const HALO_OPACITY = { min: 0.15, max: 0.45 };
type Props = {
  pulse: number;
  scales: ReturnType<typeof useVideoShapeScales>;
  colors: ReturnType<typeof DemoTheme.useDemoColors>;
};
/** Draws the pulsing halo geometry sampled by WaveDemo. */
export function WaveHalo({
  pulse,
  scales,
  colors,
}: Readonly<Props>): ReactNode {
  return (
    <svg
      width={300}
      height={300}
      viewBox="-150 -150 300 300"
      aria-hidden="true"
    >
      <circle
        r={Motion.mix({
          t: pulse,
          from: 60,
          to: 120,
        })}
        fill={colors.brand}
        opacity={scales.wash(
          Motion.mix({
            t: pulse,
            from: HALO_OPACITY.min,
            to: HALO_OPACITY.max,
          }),
        )}
      />
      <circle r={48} fill={colors.brand} />
    </svg>
  );
}
