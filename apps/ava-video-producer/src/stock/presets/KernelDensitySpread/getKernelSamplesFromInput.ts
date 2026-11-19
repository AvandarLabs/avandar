import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./KernelDensitySpread.schema";

const SPREAD_AT = 106;
const SPREAD_FRAMES = 33;
const RISE_AT = 56;
const RISE_STEP = 8;
const RISE_FRAMES = 17;

/** Exact cell-center linear cone samples at the frame's smoothing radius. */
export function getKernelSamplesFromInput({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: Pick<VideoMotion, "ramp" | "scale" | "travel">;
}>): {
  radius: number;
  cells: Array<{ x: number; y: number; intensity: number }>;
} {
  const radius = mix(
    motion.ramp(
      frame,
      SPREAD_AT,
      motion.scale(SPREAD_FRAMES),
      motion.travel.easing,
    ),
    input.radii.initial,
    input.radii.final,
  );
  const cells = Array.from({ length: input.gridSize ** 2 }, (_, index) => {
    const x = (((index % input.gridSize) + 0.5) * 100) / input.gridSize;
    const y =
      ((Math.floor(index / input.gridSize) + 0.5) * 100) / input.gridSize;
    const intensity = input.points.reduce((sum, point, pointIndex) => {
      return (
        sum +
        point.weight *
          Math.max(0, 1 - Math.hypot(x - point.x, y - point.y) / radius) *
          motion.ramp(
            frame,
            RISE_AT + pointIndex * RISE_STEP,
            motion.scale(RISE_FRAMES),
            motion.travel.easing,
          )
      );
    }, 0);
    return { x, y, intensity };
  });
  return { radius, cells };
}
