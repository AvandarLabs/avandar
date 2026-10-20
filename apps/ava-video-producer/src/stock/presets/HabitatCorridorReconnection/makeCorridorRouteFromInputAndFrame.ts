import { ramp, mix, EASE } from "../../../motion";
import type { Input } from "./HabitatCorridorReconnection.schema";
/**
 * Connected schematic waypoints overlap both patch envelopes and rise over the
 * road.
 */
export function makeCorridorRouteFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  points: Array<{ x: number; y: number }>;
  path: string;
} {
  const raisedY = mix(ramp(frame, 58, 20, EASE.inOut), 300, 250);
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
      .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
      .join(" "),
  };
}
