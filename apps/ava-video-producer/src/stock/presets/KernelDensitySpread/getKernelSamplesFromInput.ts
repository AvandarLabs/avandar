import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./KernelDensitySpread.schema";
/** Exact cell-center linear cone samples at the frame's smoothing radius. */
export function getKernelSamplesFromInput({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  radius: number;
  cells: Array<{ x: number; y: number; intensity: number }>;
} {
  const radius = mix(
    ramp(frame, 106, 33, EASE.inOut),
    input.radii.initial,
    input.radii.final,
  );
  const cells = Array.from({ length: input.gridSize ** 2 }, (_, index) => {
    const x = (((index % input.gridSize) + 0.5) * 100) / input.gridSize;
    const y =
      ((Math.floor(index / input.gridSize) + 0.5) * 100) / input.gridSize;
    const intensity = input.points.reduce(
      (sum, point, pointIndex) =>
        sum +
        point.weight *
          Math.max(0, 1 - Math.hypot(x - point.x, y - point.y) / radius) *
          ramp(frame, 56 + pointIndex * 8, 17, EASE.inOut),
      0,
    );
    return { x, y, intensity };
  });
  return { radius, cells };
}
