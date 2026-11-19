import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./AidCargoModeHandoff.schema";

/**
 * A receiving carrier waits, travels with its complete load, then stops to
 * unload.
 */
export function getCarrierPositionFromInputAndFrame({
  input,
  frame,
  index,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
}>): {
  x: number;
  y: number;
} {
  const destination = 170 + (index * 620) / (input.carriers.length - 1);
  const isFinal = index === input.carriers.length - 1;
  const distance = index === 0 ? 0 : isFinal ? 76 : 60;
  const start = index === 1 ? 66 : 112;
  const duration = isFinal ? (index === 1 ? 30 : 20) : 14;
  return {
    x: mix(
      motion.ramp(frame, start, duration, motion.travel.easing),
      destination - distance,
      destination + (isFinal ? 16 : 0),
    ),
    y: 335,
  };
}
