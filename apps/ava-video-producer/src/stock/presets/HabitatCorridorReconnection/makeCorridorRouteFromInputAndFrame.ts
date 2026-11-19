import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./HabitatCorridorReconnection.schema";
/**
 * Connected schematic waypoints overlap both patch envelopes and rise over the
 * road.
 */
export function makeCorridorRouteFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{ input: Input; frame: number; motion: VideoMotion }>): {
  points: Array<{ x: number; y: number }>;
  path: string;
} {
  const raisedY = mix(
    motion.ramp(frame, 58, motion.scale(20), motion.travel.easing),
    300,
    250,
  );
  const forward = [
    { x: 240, y: 300 },
    { x: 410, y: 300 },
    { x: 440, y: raisedY },
    { x: 520, y: raisedY },
    { x: 550, y: 300 },
    { x: 720, y: 300 },
  ];
  const points =
    input.corridor.fromPatchId === input.patches[0].id
      ? forward
      : [...forward].reverse();
  return {
    points,
    path: points
      .map((point, index) => {
        return `${index ? "L" : "M"} ${point.x} ${point.y}`;
      })
      .join(" "),
  };
}
