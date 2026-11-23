import { Motion } from "../../../motion";
import { LOOP_FRAMES } from "./PlexusField.constants";
import type { PlexusFieldInput } from "../../presets/PlexusField/PlexusField.schema";
import type { Point } from "./PlexusField.types";

/** Supplies PlexusField with frame-specific rendering geometry or progress. */
export function getParticlePointsFromFrame({
  input,
  frame,
  drift,
}: Readonly<{
  input: PlexusFieldInput;
  frame: number;
  drift: number;
}>): Point[] {
  return Array.from({ length: input.particleCount }, (_, particleIndex) => {
    const angle =
      Motion.loopPhase({
        frame,
        period: LOOP_FRAMES,
        offset: particleIndex * 11 + input.seed,
      }) *
      Math.PI *
      2;
    return {
      x:
        76 +
        ((particleIndex * 173 +
          particleIndex * particleIndex * 11 +
          input.seed * 37) %
          808) +
        Math.cos(angle) * (drift + (particleIndex % 9)),
      y:
        128 +
        ((particleIndex * 97 +
          particleIndex * particleIndex * 7 +
          input.seed * 53) %
          350) +
        Math.sin(angle) * (drift + (particleIndex % 13)),
    };
  });
}
